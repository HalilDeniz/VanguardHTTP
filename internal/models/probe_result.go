package models

import (
	"fmt"
	"strings"
)

// TechMatch represents a single technology identified on the target via
// headers, cookies, HTML body patterns, or script paths.
type TechMatch struct {
	Name       string `json:"name"`
	Category   string `json:"category"`
	Version    string `json:"version,omitempty"`
	Confidence int    `json:"confidence"`
}

// DNSInfo stores resolved network records and detected CDN/WAF provider hints.
type DNSInfo struct {
	A     []string `json:"a"`
	AAAA  []string `json:"aaaa"`
	CNAME []string `json:"cname"`
	CDN   string   `json:"cdn,omitempty"`
}

// TLSInfo holds parsed X.509 certificate metadata and TLS session parameters.
type TLSInfo struct {
	Version         string   `json:"version"`
	CipherSuite     string   `json:"cipherSuite"`
	SubjectCN       string   `json:"subjectCn"`
	Issuer          string   `json:"issuer"`
	NotBefore       string   `json:"notBefore"`
	NotAfter        string   `json:"notAfter"`
	DaysUntilExpiry int      `json:"daysUntilExpiry"`
	Expired         bool     `json:"expired"`
	SelfSigned      bool     `json:"selfSigned"`
	SANs            []string `json:"sans"`
	SerialNumber    string   `json:"serialNumber"`
}

// FaviconInfo contains the MurmurHash3 (Shodan-compatible) and MD5 digests
// computed from the target's favicon asset.
type FaviconInfo struct {
	URL         string `json:"url"`
	MMH3        int32  `json:"mmh3"`
	MD5         string `json:"md5"`
	ShodanQuery string `json:"shodanQuery"`
}

// RedirectHop records a single step inside an HTTP redirect chain.
type RedirectHop struct {
	URL        string `json:"url"`
	StatusCode int    `json:"statusCode"`
	Location   string `json:"location"`
}

// ProbeResult is the complete reconnaissance record emitted to the frontend
// for each probed target endpoint.
type ProbeResult struct {
	ID        int64  `json:"id"`
	Timestamp string `json:"timestamp"`

	// Target & URL metadata
	Input    string `json:"input"`
	URL      string `json:"url"`
	FinalURL string `json:"finalUrl"`
	Scheme   string `json:"scheme"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Path     string `json:"path"`

	// HTTP response metrics
	StatusCode     int    `json:"statusCode"`
	StatusText     string `json:"statusText"`
	Title          string `json:"title"`
	WebServer      string `json:"webServer"`
	PoweredBy      string `json:"poweredBy"`
	ContentType    string `json:"contentType"`
	ContentLength  int64  `json:"contentLength"`
	Words          int    `json:"words"`
	Lines          int    `json:"lines"`
	ResponseTimeMs int64  `json:"responseTimeMs"`
	BodySHA256     string `json:"bodySha256"`

	// Deep fingerprinting payloads
	Technologies  []TechMatch   `json:"technologies"`
	DNS           DNSInfo       `json:"dns"`
	TLS           *TLSInfo      `json:"tls,omitempty"`
	Favicon       *FaviconInfo  `json:"favicon,omitempty"`
	RedirectChain []RedirectHop `json:"redirectChain"`

	// Inspector artifacts
	RawRequest         string            `json:"rawRequest"`
	RawResponseHeaders string            `json:"rawResponseHeaders"`
	ResponseHeaders    map[string]string `json:"responseHeaders"`
	BodyPreview        string            `json:"bodyPreview"`

	// Error state (populated when a probe fails completely)
	Failed bool   `json:"failed"`
	Error  string `json:"error,omitempty"`
}

// IsLive returns true when the target responded with a valid HTTP status code.
func (r *ProbeResult) IsLive() bool {
	return !r.Failed && r.StatusCode > 0
}

// StatusCategory returns the HTTP status class ("2xx", "3xx", "4xx", "5xx", or "err").
func (r *ProbeResult) StatusCategory() string {
	switch {
	case r.StatusCode >= 200 && r.StatusCode < 300:
		return "2xx"
	case r.StatusCode >= 300 && r.StatusCode < 400:
		return "3xx"
	case r.StatusCode >= 400 && r.StatusCode < 500:
		return "4xx"
	case r.StatusCode >= 500 && r.StatusCode < 600:
		return "5xx"
	default:
		return "err"
	}
}

// PrimaryIP returns the first resolved IPv4 or IPv6 address, or an empty string.
func (r *ProbeResult) PrimaryIP() string {
	if len(r.DNS.A) > 0 {
		return r.DNS.A[0]
	}
	if len(r.DNS.AAAA) > 0 {
		return r.DNS.AAAA[0]
	}
	return ""
}

// TechNames returns a flat list of detected technology names for tabular views and exports.
func (r *ProbeResult) TechNames() []string {
	if len(r.Technologies) == 0 {
		return nil
	}
	names := make([]string, 0, len(r.Technologies))
	for _, t := range r.Technologies {
		if t.Version != "" {
			names = append(names, fmt.Sprintf("%s %s", t.Name, t.Version))
		} else {
			names = append(names, t.Name)
		}
	}
	return names
}

// FormattedTechnologies returns a comma-separated summary of detected technologies.
func (r *ProbeResult) FormattedTechnologies() string {
	names := r.TechNames()
	if len(names) == 0 {
		return ""
	}
	return strings.Join(names, ", ")
}

// HumanSize formats ContentLength into a readable byte unit (B, KB, MB).
func (r *ProbeResult) HumanSize() string {
	const (
		kb = 1024
		mb = 1024 * kb
	)
	switch {
	case r.ContentLength >= mb:
		return fmt.Sprintf("%.2f MB", float64(r.ContentLength)/float64(mb))
	case r.ContentLength >= kb:
		return fmt.Sprintf("%.1f KB", float64(r.ContentLength)/float64(kb))
	default:
		return fmt.Sprintf("%d B", r.ContentLength)
	}
}