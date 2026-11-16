package fingerprint

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/spaolacci/murmur3"

	"vanguard-http/internal/models"
)

const (
	maxFaviconBytes   = 1024 * 1024 // 1 MB safety cap for favicon downloads
	faviconReqTimeout = 5 * time.Second
)

// FetchFavicon attempts to retrieve the target's favicon (checking any HTML-declared
// icon link first, then falling back to /favicon.ico) and computes its Shodan-compatible
// MurmurHash3 (MMH3) and MD5 digests.
func FetchFavicon(
	ctx context.Context,
	client *http.Client,
	finalURL string,
	htmlIconHref string,
	userAgent string,
	customHeaders map[string]string,
) *models.FaviconInfo {
	if client == nil || finalURL == "" {
		return nil
	}

	candidates := buildFaviconCandidates(finalURL, htmlIconHref)
	for _, candidateURL := range candidates {
		data, ok := downloadFaviconCandidate(ctx, client, candidateURL, userAgent, customHeaders)
		if !ok || len(data) == 0 {
			continue
		}

		mmh3Hash := ComputeFaviconMMH3(data)
		md5Sum := md5.Sum(data)

		return &models.FaviconInfo{
			URL:         candidateURL,
			MMH3:        mmh3Hash,
			MD5:         hex.EncodeToString(md5Sum[:]),
			ShodanQuery: fmt.Sprintf("http.favicon.hash:%d", mmh3Hash),
		}
	}

	return nil
}

// ComputeFaviconMMH3 calculates the signed 32-bit MurmurHash3 of RFC-2045 Base64-encoded
// favicon bytes (76-char line wrapping with trailing newline), matching Shodan & httpx.
func ComputeFaviconMMH3(rawBytes []byte) int32 {
	if len(rawBytes) == 0 {
		return 0
	}
	rfc2045Payload := encodeBase64RFC2045(rawBytes)
	unsignedHash := murmur3.Sum32(rfc2045Payload)
	return int32(unsignedHash)
}

// encodeBase64RFC2045 encodes binary data into standard Base64 wrapped at 76 characters
// per line with '\n' line endings (including the trailing newline), matching Python's
// codecs.encode(data, "base64").
func encodeBase64RFC2045(data []byte) []byte {
	b64Len := base64.StdEncoding.EncodedLen(len(data))
	encoded := make([]byte, b64Len)
	base64.StdEncoding.Encode(encoded, data)

	const lineLen = 76
	numLines := (b64Len + lineLen - 1) / lineLen
	out := make([]byte, 0, b64Len+numLines)

	for i := 0; i < b64Len; i += lineLen {
		end := i + lineLen
		if end > b64Len {
			end = b64Len
		}
		out = append(out, encoded[i:end]...)
		out = append(out, '\n')
	}

	return out
}

// buildFaviconCandidates resolves deduplicated candidate URLs for the target's favicon.
func buildFaviconCandidates(finalURL string, htmlIconHref string) []string {
	base, err := url.Parse(finalURL)
	if err != nil {
		return nil
	}

	var candidates []string
	seen := make(map[string]struct{}, 2)

	addCandidate := func(rawRef string) {
		trimmed := strings.TrimSpace(rawRef)
		if trimmed == "" || strings.HasPrefix(strings.ToLower(trimmed), "data:") {
			return
		}
		refURL, err := url.Parse(trimmed)
		if err != nil {
			return
		}
		resolved := base.ResolveReference(refURL).String()
		if _, exists := seen[resolved]; !exists {
			seen[resolved] = struct{}{}
			candidates = append(candidates, resolved)
		}
	}

	if htmlIconHref != "" {
		addCandidate(htmlIconHref)
	}
	addCandidate("/favicon.ico")

	return candidates
}

// downloadFaviconCandidate safely fetches a favicon URL with strict size and timeout bounds,
// rejecting HTML soft-404 responses.
func downloadFaviconCandidate(
	ctx context.Context,
	client *http.Client,
	targetURL string,
	userAgent string,
	customHeaders map[string]string,
) ([]byte, bool) {
	reqCtx, cancel := context.WithTimeout(ctx, faviconReqTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, false
	}

	for k, v := range customHeaders {
		req.Header.Set(k, v)
	}
	if userAgent != "" && req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", userAgent)
	}
	if req.Header.Get("Accept") == "" {
		req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/x-icon,image/*,*/*;q=0.8")
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, false
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxFaviconBytes))
	if err != nil || len(data) == 0 {
		return nil, false
	}

	// Reject servers that return a 200 OK HTML error/index page instead of an icon
	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.Contains(contentType, "text/html") || looksLikeHTML(data) {
		return nil, false
	}

	return data, true
}

func looksLikeHTML(data []byte) bool {
	sample := bytes.TrimSpace(data)
	if len(sample) > 256 {
		sample = sample[:256]
	}
	lower := strings.ToLower(string(sample))
	return strings.HasPrefix(lower, "<!doctype html") ||
		strings.HasPrefix(lower, "<html") ||
		strings.HasPrefix(lower, "<head") ||
		strings.HasPrefix(lower, "<body")
}