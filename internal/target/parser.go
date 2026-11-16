package target

import (
	"fmt"
	"net"
	"net/netip"
	"net/url"
	"strconv"
	"strings"

	"vanguard-http/internal/models"
)

// maxCIDRHosts caps single-CIDR expansion at 65,536 addresses (an IPv4 /16)
// to prevent accidental memory exhaustion on overly broad prefixes like /0 or /8.
const maxCIDRHosts = 65536

// ProbeTarget represents a normalized, ready-to-probe HTTP/HTTPS endpoint.
type ProbeTarget struct {
	Input         string `json:"input"`
	URL           string `json:"url"`
	Scheme        string `json:"scheme"`
	Host          string `json:"host"`
	Port          int    `json:"port"`
	Path          string `json:"path"`
	ExplicitProto bool   `json:"explicitProto"`
	AllowFallback bool   `json:"allowFallback"`
}

// ParseTargets expands raw target lines (domains, IPs, CIDRs, host:port pairs,
// and full URLs) into a deduplicated slice of ProbeTargets according to ScanConfig.
func ParseTargets(rawTargets []string, cfg models.ScanConfig) ([]ProbeTarget, error) {
	tokens := tokenizeInputs(rawTargets)
	if len(tokens) == 0 {
		return nil, fmt.Errorf("no valid targets found after parsing input")
	}

	results := make([]ProbeTarget, 0, len(tokens))
	seenURLs := make(map[string]struct{}, len(tokens))

	addUnique := func(pt ProbeTarget) {
		if _, exists := seenURLs[pt.URL]; exists {
			return
		}
		seenURLs[pt.URL] = struct{}{}
		results = append(results, pt)
	}

	for _, token := range tokens {
		expanded, err := expandToken(token, cfg)
		if err != nil {
			return nil, fmt.Errorf("target %q: %w", token, err)
		}
		for _, pt := range expanded {
			addUnique(pt)
		}
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no probeable endpoints could be constructed from input")
	}

	return results, nil
}

// CountTargets calculates the exact number of deduplicated endpoints that will be
// probed for a given input list and configuration. Used by the UI target counter.
func CountTargets(rawTargets []string, cfg models.ScanConfig) (int, error) {
	targets, err := ParseTargets(rawTargets, cfg)
	if err != nil {
		return 0, err
	}
	return len(targets), nil
}

// tokenizeInputs splits multi-line, comma-separated, or space-separated raw inputs
// while stripping comments (# ...) and blank entries.
func tokenizeInputs(rawLines []string) []string {
	var tokens []string
	for _, line := range rawLines {
		// Strip inline comments
		if idx := strings.Index(line, "#"); idx != -1 {
			line = line[:idx]
		}
		// Support comma- or whitespace-separated targets on the same line
		fields := strings.FieldsFunc(line, func(r rune) bool {
			return r == ',' || r == ' ' || r == '\t' || r == '\r' || r == '\n'
		})
		for _, f := range fields {
			cleaned := strings.TrimSpace(f)
			if cleaned != "" {
				tokens = append(tokens, cleaned)
			}
		}
	}
	return tokens
}

// expandToken resolves a single token (CIDR, URL, host:port, or bare host) into
// one or more concrete ProbeTargets.
func expandToken(token string, cfg models.ScanConfig) ([]ProbeTarget, error) {
	// 1. Check if token is a CIDR block (e.g., 192.168.1.0/24 or 2001:db8::/120)
	if !strings.Contains(token, "://") && strings.Contains(token, "/") {
		if prefix, err := netip.ParsePrefix(token); err == nil {
			ips, err := expandCIDR(prefix)
			if err != nil {
				return nil, err
			}
			var out []ProbeTarget
			for _, ipStr := range ips {
				pts, err := buildHostTargets(token, ipStr, 0, cfg.CustomPath, false, "", cfg)
				if err != nil {
					return nil, err
				}
				out = append(out, pts...)
			}
			return out, nil
		}
	}

	// 2. Check if token already contains an explicit scheme (http:// or https://)
	if strings.Contains(token, "://") {
		parsed, err := url.Parse(token)
		if err != nil {
			return nil, fmt.Errorf("malformed URL: %w", err)
		}
		scheme := strings.ToLower(parsed.Scheme)
		if scheme != "http" && scheme != "https" {
			return nil, fmt.Errorf("unsupported URL scheme %q: only http and https are supported", parsed.Scheme)
		}
		host := parsed.Hostname()
		if host == "" {
			return nil, fmt.Errorf("missing hostname in URL")
		}

		explicitPort := 0
		if portStr := parsed.Port(); portStr != "" {
			p, err := strconv.Atoi(portStr)
			if err != nil || p < 1 || p > 65535 {
				return nil, fmt.Errorf("invalid port %q in URL", portStr)
			}
			explicitPort = p
		}

		path := parsed.EscapedPath()
		if parsed.RawQuery != "" {
			path += "?" + parsed.RawQuery
		}
		if path == "" && cfg.CustomPath != "" {
			path = cfg.CustomPath
		}

		return buildHostTargets(token, host, explicitPort, path, true, scheme, cfg)
	}

	// 3. Bare host, IP, or host:port (with optional trailing path like example.com/admin)
	hostPart := token
	pathPart := ""
	if slashIdx := strings.Index(token, "/"); slashIdx != -1 {
		hostPart = token[:slashIdx]
		pathPart = token[slashIdx:]
	}
	if pathPart == "" && cfg.CustomPath != "" {
		pathPart = cfg.CustomPath
	}

	host, explicitPort, err := splitHostAndPort(hostPart)
	if err != nil {
		return nil, err
	}

	return buildHostTargets(token, host, explicitPort, pathPart, false, "", cfg)
}

// splitHostAndPort safely extracts host and optional port for IPv4, IPv6, and domain names.
func splitHostAndPort(hostPort string) (string, int, error) {
	// Bare IPv6 address without brackets (e.g., 2001:db8::1)
	if ip, err := netip.ParseAddr(hostPort); err == nil {
		return ip.String(), 0, nil
	}

	// Bracketed IPv6 without port (e.g., [2001:db8::1])
	if strings.HasPrefix(hostPort, "[") && strings.HasSuffix(hostPort, "]") {
		inner := strings.TrimSuffix(strings.TrimPrefix(hostPort, "["), "]")
		if ip, err := netip.ParseAddr(inner); err == nil {
			return ip.String(), 0, nil
		}
		return "", 0, fmt.Errorf("invalid IPv6 address %q", hostPort)
	}

	// Host:Port pair (works for domain:port, ipv4:port, and [ipv6]:port)
	if strings.Contains(hostPort, ":") {
		h, pStr, err := net.SplitHostPort(hostPort)
		if err != nil {
			return "", 0, fmt.Errorf("invalid host:port format %q: %w", hostPort, err)
		}
		if h == "" {
			return "", 0, fmt.Errorf("missing host in %q", hostPort)
		}
		p, err := strconv.Atoi(pStr)
		if err != nil || p < 1 || p > 65535 {
			return "", 0, fmt.Errorf("invalid TCP port %q", pStr)
		}
		return h, p, nil
	}

	if hostPort == "" {
		return "", 0, fmt.Errorf("empty hostname")
	}

	return hostPort, 0, nil
}

// buildHostTargets applies port lists and scheme rules (explicit, dual-probe, or HTTPS->HTTP fallback)
// to generate concrete ProbeTarget entries.
func buildHostTargets(
	rawInput string,
	host string,
	explicitPort int,
	path string,
	explicitProto bool,
	explicitScheme string,
	cfg models.ScanConfig,
) ([]ProbeTarget, error) {
	// Determine target ports
	var targetPorts []int
	if explicitPort > 0 {
		targetPorts = []int{explicitPort}
	} else if len(cfg.Ports) > 0 {
		targetPorts = cfg.Ports
	}

	// Case 1: Explicit scheme supplied by user (http:// or https://)
	if explicitProto {
		if len(targetPorts) == 0 {
			defaultPort := 80
			if explicitScheme == "https" {
				defaultPort = 443
			}
			return []ProbeTarget{
				makeProbeTarget(rawInput, explicitScheme, host, defaultPort, path, true, false),
			}, nil
		}

		out := make([]ProbeTarget, 0, len(targetPorts))
		for _, port := range targetPorts {
			out = append(out, makeProbeTarget(rawInput, explicitScheme, host, port, path, true, false))
		}
		return out, nil
	}

	// Case 2: Bare host/IP with no explicit ports and no custom port list
	if len(targetPorts) == 0 {
		if cfg.ProbeBothSchemes {
			return []ProbeTarget{
				makeProbeTarget(rawInput, "https", host, 443, path, false, false),
				makeProbeTarget(rawInput, "http", host, 80, path, false, false),
			}, nil
		}
		// Default smart behavior: probe HTTPS first, automatically fall back to HTTP if TLS/connect fails
		return []ProbeTarget{
			makeProbeTarget(rawInput, "https", host, 443, path, false, cfg.HTTPSFallback),
		}, nil
	}

	// Case 3: Bare host/IP with explicit port or custom port list
	out := make([]ProbeTarget, 0, len(targetPorts)*2)
	for _, port := range targetPorts {
		if cfg.ProbeBothSchemes {
			out = append(out,
				makeProbeTarget(rawInput, "https", host, port, path, false, false),
				makeProbeTarget(rawInput, "http", host, port, path, false, false),
			)
			continue
		}

		switch port {
		case 80:
			out = append(out, makeProbeTarget(rawInput, "http", host, 80, path, false, false))
		case 443:
			out = append(out, makeProbeTarget(rawInput, "https", host, 443, path, false, cfg.HTTPSFallback))
		default:
			// For non-standard ports (e.g., 8080, 8443, 3000), probe HTTPS with automatic HTTP fallback
			out = append(out, makeProbeTarget(rawInput, "https", host, port, path, false, cfg.HTTPSFallback))
		}
	}

	return out, nil
}

// makeProbeTarget formats a canonical URL (omitting redundant :80 / :443 ports and bracketing IPv6).
func makeProbeTarget(
	input, scheme, host string,
	port int,
	path string,
	explicitProto, allowFallback bool,
) ProbeTarget {
	formattedHost := host
	if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") {
		formattedHost = "[" + host + "]"
	}

	isDefaultPort := (scheme == "http" && port == 80) || (scheme == "https" && port == 443)
	authority := formattedHost
	if !isDefaultPort && port > 0 {
		authority = fmt.Sprintf("%s:%d", formattedHost, port)
	}

	normalizedPath := path
	if normalizedPath != "" && !strings.HasPrefix(normalizedPath, "/") {
		normalizedPath = "/" + normalizedPath
	}

	return ProbeTarget{
		Input:         input,
		URL:           fmt.Sprintf("%s://%s%s", scheme, authority, normalizedPath),
		Scheme:        scheme,
		Host:          host,
		Port:          port,
		Path:          normalizedPath,
		ExplicitProto: explicitProto,
		AllowFallback: allowFallback,
	}
}

// expandCIDR converts an IPv4 or IPv6 CIDR prefix into individual host IP strings.
func expandCIDR(prefix netip.Prefix) ([]string, error) {
	masked := prefix.Masked()
	addr := masked.Addr()
	bits := masked.Bits()
	totalBits := addr.BitLen()
	hostBits := totalBits - bits

	if hostBits > 16 {
		return nil, fmt.Errorf("CIDR prefix /%d exceeds safety cap of %d hosts (max /16 for IPv4 or /112 for IPv6)", bits, maxCIDRHosts)
	}

	totalAddrs := 1 << hostBits
	ips := make([]string, 0, totalAddrs)

	current := addr
	for i := 0; i < totalAddrs && current.IsValid(); i++ {
		// For IPv4 subnets larger than /31 (e.g. /24), skip network (.0) and broadcast (.255) addresses
		if addr.Is4() && hostBits >= 2 {
			if i == 0 || i == totalAddrs-1 {
				current = current.Next()
				continue
			}
		}
		ips = append(ips, current.String())
		current = current.Next()
	}

	return ips, nil
}