package fingerprint

import (
	"context"
	"net"
	"net/netip"
	"slices"
	"strings"
	"time"

	"vanguard-http/internal/models"
)

const defaultDNSTimeout = 4 * time.Second

// cdnSignature maps canonical CNAME domain suffixes to known CDN/WAF providers.
type cdnSignature struct {
	suffix   string
	provider string
}

var cdnCNAMESignatures = []cdnSignature{
	{suffix: ".cloudflare.net", provider: "Cloudflare"},
	{suffix: ".cloudflare.com", provider: "Cloudflare"},
	{suffix: ".cdn.cloudflare.net", provider: "Cloudflare"},
	{suffix: ".cloudfront.net", provider: "Amazon CloudFront"},
	{suffix: ".amazonaws.com", provider: "AWS"},
	{suffix: ".akamaiedge.net", provider: "Akamai"},
	{suffix: ".akamai.net", provider: "Akamai"},
	{suffix: ".akamaized.net", provider: "Akamai"},
	{suffix: ".akadns.net", provider: "Akamai"},
	{suffix: ".edgekey.net", provider: "Akamai"},
	{suffix: ".edgesuite.net", provider: "Akamai"},
	{suffix: ".fastly.net", provider: "Fastly"},
	{suffix: ".fastlylb.net", provider: "Fastly"},
	{suffix: ".impervadns.net", provider: "Imperva Incapsula"},
	{suffix: ".incapdns.net", provider: "Imperva Incapsula"},
	{suffix: ".azureedge.net", provider: "Microsoft Azure CDN"},
	{suffix: ".azurefd.net", provider: "Azure Front Door"},
	{suffix: ".trafficmanager.net", provider: "Azure Traffic Manager"},
	{suffix: ".googleusercontent.com", provider: "Google Cloud"},
	{suffix: ".ghs.googlehosted.com", provider: "Google Cloud"},
	{suffix: ".sucuri.net", provider: "Sucuri WAF"},
	{suffix: ".stackpathdns.com", provider: "StackPath"},
	{suffix: ".hwcdn.net", provider: "StackPath Highwinds"},
	{suffix: ".b-cdn.net", provider: "BunnyCDN"},
	{suffix: ".bunny.net", provider: "BunnyCDN"},
	{suffix: ".cdn77.org", provider: "CDN77"},
	{suffix: ".kxcdn.com", provider: "KeyCDN"},
	{suffix: ".netlify.app", provider: "Netlify"},
	{suffix: ".vercel-dns.com", provider: "Vercel"},
	{suffix: ".herokuapp.com", provider: "Heroku"},
	{suffix: ".github.io", provider: "GitHub Pages"},
	{suffix: ".wpengine.com", provider: "WP Engine"},
	{suffix: ".pantheonsite.io", provider: "Pantheon"},
}

// ResolveDNS performs a timeout-bounded lookup of A, AAAA, and CNAME records
// for the given host and identifies known CDN/WAF providers from CNAME chains.
func ResolveDNS(ctx context.Context, host string) models.DNSInfo {
	info := models.DNSInfo{
		A:     []string{},
		AAAA:  []string{},
		CNAME: []string{},
	}

	cleanHost := strings.TrimSpace(strings.Trim(host, "[]"))
	if cleanHost == "" {
		return info
	}

	// If the target is already a literal IPv4 or IPv6 address, populate directly
	if parsedIP, err := netip.ParseAddr(cleanHost); err == nil {
		if parsedIP.Is4() {
			info.A = []string{parsedIP.String()}
		} else if parsedIP.Is6() {
			info.AAAA = []string{parsedIP.String()}
		}
		return info
	}

	lookupCtx, cancel := context.WithTimeout(ctx, defaultDNSTimeout)
	defer cancel()

	resolver := &net.Resolver{PreferGo: true}

	// 1. Resolve canonical CNAME record
	if cname, err := resolver.LookupCNAME(lookupCtx, cleanHost); err == nil {
		trimmedCNAME := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(cname)), ".")
		normalizedInput := strings.TrimSuffix(strings.ToLower(cleanHost), ".")
		if trimmedCNAME != "" && trimmedCNAME != normalizedInput {
			info.CNAME = append(info.CNAME, trimmedCNAME)
			if provider := detectCDNFromCNAME(trimmedCNAME); provider != "" {
				info.CDN = provider
			}
		}
	}

	// 2. Resolve A (IPv4) and AAAA (IPv6) addresses
	addrs, err := resolver.LookupNetIP(lookupCtx, "ip", cleanHost)
	if err == nil {
		for _, addr := range addrs {
			ipStr := addr.String()
			if addr.Is4() {
				if !slices.Contains(info.A, ipStr) {
					info.A = append(info.A, ipStr)
				}
			} else if addr.Is6() {
				if !slices.Contains(info.AAAA, ipStr) {
					info.AAAA = append(info.AAAA, ipStr)
				}
			}
		}
	}

	return info
}

// detectCDNFromCNAME matches a normalized CNAME target against known CDN/WAF suffixes.
func detectCDNFromCNAME(cname string) string {
	lower := strings.ToLower(strings.TrimSuffix(cname, "."))
	for _, sig := range cdnCNAMESignatures {
		if strings.HasSuffix(lower, sig.suffix) {
			return sig.provider
		}
	}
	return ""
}