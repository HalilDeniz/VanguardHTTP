package engine

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/proxy"

	"vanguard-http/internal/models"
)

type redirectCtxKey struct{}

// redirectTracker safely captures HTTP redirect hops for a single request lifecycle
// across a shared http.Client.
type redirectTracker struct {
	mu   sync.Mutex
	hops []models.RedirectHop
}

func (rt *redirectTracker) add(hop models.RedirectHop) {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	rt.hops = append(rt.hops, hop)
}

func (rt *redirectTracker) snapshot() []models.RedirectHop {
	rt.mu.Lock()
	defer rt.mu.Unlock()
	if len(rt.hops) == 0 {
		return []models.RedirectHop{}
	}
	out := make([]models.RedirectHop, len(rt.hops))
	copy(out, rt.hops)
	return out
}

// WithRedirectTracker attaches an isolated redirect chain collector to the request context.
func WithRedirectTracker(ctx context.Context) context.Context {
	return context.WithValue(ctx, redirectCtxKey{}, &redirectTracker{})
}

// GetRedirectChain retrieves all recorded redirect hops from the request context.
func GetRedirectChain(ctx context.Context) []models.RedirectHop {
	if tracker, ok := ctx.Value(redirectCtxKey{}).(*redirectTracker); ok && tracker != nil {
		return tracker.snapshot()
	}
	return []models.RedirectHop{}
}

// BuildHTTPClient constructs a pooled, proxy-aware http.Client tailored for
// high-concurrency security reconnaissance.
func BuildHTTPClient(cfg models.ScanConfig) (*http.Client, error) {
	timeout := time.Duration(cfg.TimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	dialer := &net.Dialer{
		Timeout:   timeout,
		KeepAlive: 30 * time.Second,
	}

	maxConns := cfg.Threads * 2
	if maxConns < 100 {
		maxConns = 100
	}

	transport := &http.Transport{
		DialContext:           dialer.DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          maxConns,
		MaxIdleConnsPerHost:   16,
		MaxConnsPerHost:       0,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   timeout,
		ResponseHeaderTimeout: timeout,
		ExpectContinueTimeout: 1 * time.Second,
		DisableKeepAlives:     false,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: !cfg.VerifySSL,
			MinVersion:         tls.VersionTLS10,
		},
	}

	if cfg.ProxyURL != "" {
		if err := configureTransportProxy(transport, dialer, cfg.ProxyURL); err != nil {
			return nil, err
		}
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > 0 && req.Response != nil {
				prevReq := via[len(via)-1]
				if tracker, ok := req.Context().Value(redirectCtxKey{}).(*redirectTracker); ok && tracker != nil {
					tracker.add(models.RedirectHop{
						URL:        prevReq.URL.String(),
						StatusCode: req.Response.StatusCode,
						Location:   req.URL.String(),
					})
				}
			}

			if !cfg.FollowRedirects {
				return http.ErrUseLastResponse
			}
			if len(via) >= cfg.MaxRedirects {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	return client, nil
}

// configureTransportProxy wires HTTP, HTTPS, SOCKS5, or SOCKS5H proxies into the transport.
func configureTransportProxy(transport *http.Transport, baseDialer *net.Dialer, rawProxyURL string) error {
	parsed, err := url.Parse(rawProxyURL)
	if err != nil {
		return fmt.Errorf("failed to parse proxy URL: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	switch scheme {
	case "http", "https":
		transport.Proxy = http.ProxyURL(parsed)
		return nil

	case "socks5", "socks5h":
		socksDialer, err := proxy.FromURL(parsed, baseDialer)
		if err != nil {
			return fmt.Errorf("failed to initialize SOCKS5 proxy dialer: %w", err)
		}

		if ctxDialer, ok := socksDialer.(proxy.ContextDialer); ok {
			transport.DialContext = ctxDialer.DialContext
		} else {
			transport.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
				type dialResult struct {
					conn net.Conn
					err  error
				}
				resCh := make(chan dialResult, 1)
				go func() {
					c, dErr := socksDialer.Dial(network, addr)
					resCh <- dialResult{conn: c, err: dErr}
				}()

				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case res := <-resCh:
					return res.conn, res.err
				}
			}
		}
		return nil

	default:
		return fmt.Errorf("unsupported proxy protocol %q", parsed.Scheme)
	}
}