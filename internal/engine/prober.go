package engine

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"vanguard-http/internal/fingerprint"
	"vanguard-http/internal/models"
	"vanguard-http/internal/target"
	"vanguard-http/internal/useragent"
)

// ProbeTarget executes a full reconnaissance probe against a single normalized target,
// including retries, optional HTTPS->HTTP fallback, and deep fingerprinting.
func ProbeTarget(
	ctx context.Context,
	client *http.Client,
	pt target.ProbeTarget,
	cfg models.ScanConfig,
	resultID int64,
) models.ProbeResult {
	baseResult := models.ProbeResult{
		ID:              resultID,
		Timestamp:       time.Now().UTC().Format(time.RFC3339),
		Input:           pt.Input,
		URL:             pt.URL,
		FinalURL:        pt.URL,
		Scheme:          pt.Scheme,
		Host:            pt.Host,
		Port:            pt.Port,
		Path:            pt.Path,
		Technologies:    []models.TechMatch{},
		DNS:             models.DNSInfo{A: []string{}, AAAA: []string{}, CNAME: []string{}},
		RedirectChain:   []models.RedirectHop{},
		ResponseHeaders: map[string]string{},
	}

	// 1. Resolve DNS records upfront if enabled
	if cfg.EnableDNS {
		baseResult.DNS = fingerprint.ResolveDNS(ctx, pt.Host)
	}

	// 2. Attempt primary probe with configured retries
	res, err := executeWithRetries(ctx, client, pt, cfg, baseResult)
	if err == nil {
		return res
	}

	// 3. Automatic HTTPS -> HTTP fallback for bare hosts when enabled
	if pt.Scheme == "https" && pt.AllowFallback && !pt.ExplicitProto && ctx.Err() == nil {
		fallbackTarget := buildHTTPFallbackTarget(pt)
		fallbackBase := baseResult
		fallbackBase.URL = fallbackTarget.URL
		fallbackBase.FinalURL = fallbackTarget.URL
		fallbackBase.Scheme = fallbackTarget.Scheme
		fallbackBase.Port = fallbackTarget.Port

		if fallbackRes, fallbackErr := executeWithRetries(ctx, client, fallbackTarget, cfg, fallbackBase); fallbackErr == nil {
			return fallbackRes
		}
	}

	// 4. All attempts exhausted; return structured failure record without crashing
	baseResult.Failed = true
	baseResult.Error = classifyNetworkError(err)
	return baseResult
}

func buildHTTPFallbackTarget(pt target.ProbeTarget) target.ProbeTarget {
	fallbackPort := pt.Port
	if fallbackPort == 443 || fallbackPort == 0 {
		fallbackPort = 80
	}

	formattedHost := pt.Host
	if strings.Contains(pt.Host, ":") && !strings.HasPrefix(pt.Host, "[") {
		formattedHost = "[" + pt.Host + "]"
	}

	authority := formattedHost
	if fallbackPort != 80 {
		authority = fmt.Sprintf("%s:%d", formattedHost, fallbackPort)
	}

	return target.ProbeTarget{
		Input:         pt.Input,
		URL:           fmt.Sprintf("http://%s%s", authority, pt.Path),
		Scheme:        "http",
		Host:          pt.Host,
		Port:          fallbackPort,
		Path:          pt.Path,
		ExplicitProto: false,
		AllowFallback: false,
	}
}

func executeWithRetries(
	ctx context.Context,
	client *http.Client,
	pt target.ProbeTarget,
	cfg models.ScanConfig,
	template models.ProbeResult,
) (models.ProbeResult, error) {
	attempts := cfg.Retries + 1
	if attempts < 1 {
		attempts = 1
	}

	var lastErr error
	for attempt := 0; attempt < attempts; attempt++ {
		if ctx.Err() != nil {
			return template, ctx.Err()
		}

		if attempt > 0 {
			backoff := time.Duration(attempt*200) * time.Millisecond
			select {
			case <-ctx.Done():
				return template, ctx.Err()
			case <-time.After(backoff):
			}
		}

		res, err := executeSingleAttempt(ctx, client, pt, cfg, template)
		if err == nil {
			return res, nil
		}
		lastErr = err
	}

	return template, lastErr
}

func executeSingleAttempt(
	ctx context.Context,
	client *http.Client,
	pt target.ProbeTarget,
	cfg models.ScanConfig,
	template models.ProbeResult,
) (models.ProbeResult, error) {
	reqCtx := WithRedirectTracker(ctx)

	var bodyReader io.Reader
	if cfg.RequestBody != "" && (cfg.Method == http.MethodPost || cfg.Method == http.MethodPut || cfg.Method == http.MethodPatch) {
		bodyReader = strings.NewReader(cfg.RequestBody)
	}

	req, err := http.NewRequestWithContext(reqCtx, cfg.Method, pt.URL, bodyReader)
	if err != nil {
		return template, err
	}

	ua := useragent.Resolve(cfg.UserAgent, cfg.RandomUserAgent)
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Connection", "keep-alive")

	for k, v := range cfg.CustomHeaders {
		if strings.EqualFold(k, "Host") {
			req.Host = v
		} else {
			req.Header.Set(k, v)
		}
	}

	rawReqStr := formatRawRequest(req, cfg.RequestBody)

	startTime := time.Now()
	resp, err := client.Do(req)
	elapsedMs := time.Since(startTime).Milliseconds()
	if err != nil {
		return template, err
	}
	defer resp.Body.Close()

	// Safely read up to MaxBodySizeKB to prevent memory exhaustion on massive streams
	maxBytes := int64(cfg.MaxBodySizeKB) * 1024
	if maxBytes <= 0 {
		maxBytes = models.DefaultMaxBodySizeKB * 1024
	}

	limitedReader := io.LimitReader(resp.Body, maxBytes)
	bodyBytes, readErr := io.ReadAll(limitedReader)
	if readErr != nil && len(bodyBytes) == 0 {
		return template, readErr
	}

	result := template
	result.Failed = false
	result.Error = ""
	result.ResponseTimeMs = elapsedMs
	result.StatusCode = resp.StatusCode
	result.StatusText = http.StatusText(resp.StatusCode)
	result.WebServer = strings.TrimSpace(resp.Header.Get("Server"))
	result.PoweredBy = strings.TrimSpace(resp.Header.Get("X-Powered-By"))
	result.ContentType = strings.TrimSpace(resp.Header.Get("Content-Type"))
	result.RawRequest = rawReqStr
	result.RawResponseHeaders = formatRawResponseHeaders(resp)
	result.ResponseHeaders = flattenHeaders(resp.Header)
	result.RedirectChain = GetRedirectChain(reqCtx)

	if resp.Request != nil && resp.Request.URL != nil {
		result.FinalURL = resp.Request.URL.String()
		result.Scheme = resp.Request.URL.Scheme
	}

	if resp.ContentLength >= 0 {
		result.ContentLength = resp.ContentLength
	} else {
		result.ContentLength = int64(len(bodyBytes))
	}

	// HTML & content analysis
	htmlAnalysis := fingerprint.AnalyzeHTML(bodyBytes)
	result.Title = htmlAnalysis.Title
	result.Words = htmlAnalysis.Words
	result.Lines = htmlAnalysis.Lines
	result.BodySHA256 = htmlAnalysis.BodySHA256
	result.BodyPreview = htmlAnalysis.BodyPreview

	// TLS certificate inspection
	if cfg.EnableTLS && resp.TLS != nil {
		result.TLS = fingerprint.ExtractTLSInfo(resp.TLS)
	}

	// Technology stack detection
	if cfg.EnableTechDetect {
		result.Technologies = fingerprint.DetectTechnologies(
			resp.Header,
			bodyBytes,
			htmlAnalysis,
			result.DNS.CDN,
		)
	}

	// Favicon MMH3 hashing (only for live responses where favicon probing is enabled)
	if cfg.EnableFavicon && resp.StatusCode < 500 {
		result.Favicon = fingerprint.FetchFavicon(
			ctx,
			client,
			result.FinalURL,
			htmlAnalysis.FaviconHref,
			ua,
			cfg.CustomHeaders,
		)
	}

	return result, nil
}

func formatRawRequest(req *http.Request, body string) string {
	var buf strings.Builder

	requestURI := req.URL.RequestURI()
	if requestURI == "" {
		requestURI = "/"
	}
	fmt.Fprintf(&buf, "%s %s HTTP/1.1\r\n", req.Method, requestURI)

	hostHeader := req.Host
	if hostHeader == "" {
		hostHeader = req.URL.Host
	}
	fmt.Fprintf(&buf, "Host: %s\r\n", hostHeader)

	keys := make([]string, 0, len(req.Header))
	for k := range req.Header {
		if strings.EqualFold(k, "Host") {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		for _, v := range req.Header[k] {
			fmt.Fprintf(&buf, "%s: %s\r\n", k, v)
		}
	}

	buf.WriteString("\r\n")
	if body != "" {
		buf.WriteString(body)
	}

	return buf.String()
}

func formatRawResponseHeaders(resp *http.Response) string {
	var buf strings.Builder
	fmt.Fprintf(&buf, "%s %s\r\n", resp.Proto, resp.Status)

	keys := make([]string, 0, len(resp.Header))
	for k := range resp.Header {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		for _, v := range resp.Header[k] {
			fmt.Fprintf(&buf, "%s: %s\r\n", k, v)
		}
	}

	return buf.String()
}

func flattenHeaders(h http.Header) map[string]string {
	out := make(map[string]string, len(h))
	for k, vals := range h {
		out[k] = strings.Join(vals, ", ")
	}
	return out
}

func classifyNetworkError(err error) string {
	if err == nil {
		return ""
	}
	if errors.Is(err, context.Canceled) {
		return "Scan canceled"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "Request timeout"
	}

	msg := err.Error()
	lower := strings.ToLower(msg)

	switch {
	case strings.Contains(lower, "timeout") || strings.Contains(lower, "deadline exceeded"):
		return "Connection/Read timeout"
	case strings.Contains(lower, "no such host"):
		return "DNS resolution failed (NXDOMAIN)"
	case strings.Contains(lower, "connection refused"):
		return "Connection refused"
	case strings.Contains(lower, "connection reset"):
		return "Connection reset by peer"
	case strings.Contains(lower, "tls:") || strings.Contains(lower, "x509:"):
		return fmt.Sprintf("TLS handshake error: %s", msg)
	case strings.Contains(lower, "socks"):
		return fmt.Sprintf("SOCKS proxy error: %s", msg)
	default:
		return msg
	}
}