package models

import (
	"errors"
	"fmt"
	"net/url"
	"slices"
	"strings"
)

const (
	DefaultThreads       = 50
	MaxAllowedThreads    = 1000
	DefaultRateLimit     = 150
	DefaultTimeoutSec    = 10
	MaxAllowedTimeoutSec = 120
	DefaultRetries       = 1
	MaxAllowedRetries    = 5
	DefaultMaxRedirects  = 10
	MaxAllowedRedirects  = 25
	DefaultMaxBodySizeKB = 2048 // 2 MB cap per response to prevent memory exhaustion
	MaxAllowedBodySizeKB = 10240
)

// allowedHTTPMethods defines the safe set of HTTP verbs supported by the prober.
var allowedHTTPMethods = []string{
	"GET",
	"HEAD",
	"POST",
	"OPTIONS",
	"PUT",
	"PATCH",
	"DELETE",
}

// ScanConfig encapsulates every operational parameter passed from the Wails UI
// to the Go probing engine.
type ScanConfig struct {
	// Target definitions
	Targets    []string `json:"targets"`
	Ports      []int    `json:"ports"`
	CustomPath string   `json:"customPath"`

	// HTTP Request customization
	Method          string            `json:"method"`
	RequestBody     string            `json:"requestBody"`
	CustomHeaders   map[string]string `json:"customHeaders"`
	UserAgent       string            `json:"userAgent"`
	RandomUserAgent bool              `json:"randomUserAgent"`
	ProxyURL        string            `json:"proxyUrl"`

	// Concurrency, rate limiting & resilience
	Threads       int `json:"threads"`
	RateLimit     int `json:"rateLimit"` // Requests per second (0 = unlimited)
	TimeoutSec    int `json:"timeoutSec"`
	Retries       int `json:"retries"`
	MaxBodySizeKB int `json:"maxBodySizeKb"`

	// Protocol & redirect behavior
	FollowRedirects  bool `json:"followRedirects"`
	MaxRedirects     int  `json:"maxRedirects"`
	ProbeBothSchemes bool `json:"probeBothSchemes"` // Probe both https:// and http:// for bare hosts
	HTTPSFallback    bool `json:"httpsFallback"`    // Fallback to http:// if https:// handshake fails
	VerifySSL        bool `json:"verifySsl"`

	// Fingerprinting modules toggles
	EnableTechDetect bool `json:"enableTechDetect"`
	EnableDNS        bool `json:"enableDns"`
	EnableTLS        bool `json:"enableTls"`
	EnableFavicon    bool `json:"enableFavicon"`
}

// DefaultScanConfig returns a production-ready baseline configuration optimized
// for fast, balanced reconnaissance.
func DefaultScanConfig() ScanConfig {
	return ScanConfig{
		Targets:          []string{},
		Ports:            []int{},
		CustomPath:       "",
		Method:           "GET",
		RequestBody:      "",
		CustomHeaders:    map[string]string{},
		UserAgent:        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
		RandomUserAgent:  true,
		ProxyURL:         "",
		Threads:          DefaultThreads,
		RateLimit:        DefaultRateLimit,
		TimeoutSec:       DefaultTimeoutSec,
		Retries:          DefaultRetries,
		MaxBodySizeKB:    DefaultMaxBodySizeKB,
		FollowRedirects:  true,
		MaxRedirects:     DefaultMaxRedirects,
		ProbeBothSchemes: false,
		HTTPSFallback:    true,
		VerifySSL:        false,
		EnableTechDetect: true,
		EnableDNS:        true,
		EnableTLS:        true,
		EnableFavicon:    true,
	}
}

// NormalizeAndValidate sanitizes user-supplied parameters, clamps resource-heavy
// thresholds within safe operational bounds, and returns descriptive errors for
// invalid network configurations.
func (c *ScanConfig) NormalizeAndValidate() error {
	if len(c.Targets) == 0 {
		return errors.New("at least one target domain, IP, CIDR, or URL is required")
	}

	// Normalize and validate HTTP Method
	c.Method = strings.ToUpper(strings.TrimSpace(c.Method))
	if c.Method == "" {
		c.Method = "GET"
	}
	if !slices.Contains(allowedHTTPMethods, c.Method) {
		return fmt.Errorf("unsupported HTTP method %q: allowed methods are %s", c.Method, strings.Join(allowedHTTPMethods, ", "))
	}

	// Validate and deduplicate custom TCP ports
	if len(c.Ports) > 0 {
		seenPorts := make(map[int]struct{}, len(c.Ports))
		validPorts := make([]int, 0, len(c.Ports))
		for _, port := range c.Ports {
			if port < 1 || port > 65535 {
				return fmt.Errorf("invalid TCP port %d: must be between 1 and 65535", port)
			}
			if _, exists := seenPorts[port]; !exists {
				seenPorts[port] = struct{}{}
				validPorts = append(validPorts, port)
			}
		}
		c.Ports = validPorts
	}

	// Normalize custom path prefix
	c.CustomPath = strings.TrimSpace(c.CustomPath)
	if c.CustomPath != "" && !strings.HasPrefix(c.CustomPath, "/") {
		c.CustomPath = "/" + c.CustomPath
	}

	// Validate Proxy URL (HTTP, HTTPS, SOCKS5, SOCKS5H)
	c.ProxyURL = strings.TrimSpace(c.ProxyURL)
	if c.ProxyURL != "" {
		parsedProxy, err := url.Parse(c.ProxyURL)
		if err != nil {
			return fmt.Errorf("invalid proxy URL %q: %w", c.ProxyURL, err)
		}
		scheme := strings.ToLower(parsedProxy.Scheme)
		if scheme != "http" && scheme != "https" && scheme != "socks5" && scheme != "socks5h" {
			return fmt.Errorf("unsupported proxy scheme %q: must be http, https, socks5, or socks5h", parsedProxy.Scheme)
		}
		if parsedProxy.Host == "" {
			return fmt.Errorf("invalid proxy URL %q: missing host or port", c.ProxyURL)
		}
	}

	// Sanitize custom HTTP headers
	if c.CustomHeaders == nil {
		c.CustomHeaders = make(map[string]string)
	} else {
		cleanedHeaders := make(map[string]string, len(c.CustomHeaders))
		for rawKey, rawVal := range c.CustomHeaders {
			key := strings.TrimSpace(rawKey)
			if key == "" {
				continue
			}
			if strings.ContainsAny(key, "\r\n:") {
				return fmt.Errorf("invalid header name %q: contains illegal characters", key)
			}
			val := strings.ReplaceAll(rawVal, "\r", "")
			val = strings.ReplaceAll(val, "\n", "")
			cleanedHeaders[key] = strings.TrimSpace(val)
		}
		c.CustomHeaders = cleanedHeaders
	}

	// Clamp worker threads
	if c.Threads <= 0 {
		c.Threads = DefaultThreads
	} else if c.Threads > MaxAllowedThreads {
		c.Threads = MaxAllowedThreads
	}

	// Clamp rate limit (negative values treated as unlimited 0)
	if c.RateLimit < 0 {
		c.RateLimit = 0
	}

	// Clamp per-request timeout
	if c.TimeoutSec <= 0 {
		c.TimeoutSec = DefaultTimeoutSec
	} else if c.TimeoutSec > MaxAllowedTimeoutSec {
		c.TimeoutSec = MaxAllowedTimeoutSec
	}

	// Clamp retry count
	if c.Retries < 0 {
		c.Retries = 0
	} else if c.Retries > MaxAllowedRetries {
		c.Retries = MaxAllowedRetries
	}

	// Clamp redirect depth
	if c.MaxRedirects <= 0 {
		c.MaxRedirects = DefaultMaxRedirects
	} else if c.MaxRedirects > MaxAllowedRedirects {
		c.MaxRedirects = MaxAllowedRedirects
	}

	// Clamp maximum body read limit
	if c.MaxBodySizeKB <= 0 {
		c.MaxBodySizeKB = DefaultMaxBodySizeKB
	} else if c.MaxBodySizeKB > MaxAllowedBodySizeKB {
		c.MaxBodySizeKB = MaxAllowedBodySizeKB
	}

	// Ensure fallback User-Agent is never empty when random pool is disabled
	c.UserAgent = strings.TrimSpace(c.UserAgent)
	if !c.RandomUserAgent && c.UserAgent == "" {
		c.UserAgent = DefaultScanConfig().UserAgent
	}

	return nil
}