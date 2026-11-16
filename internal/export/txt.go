package export

import (
	"strings"

	"vanguard-http/internal/models"
)

// ExportTXT outputs a clean, deduplicated newline-separated list of live target URLs,
// ready for chaining into downstream security tools (e.g., nuclei, ffuf, katana).
func ExportTXT(results []models.ProbeResult) ([]byte, error) {
	var buf strings.Builder
	seen := make(map[string]struct{}, len(results))

	for i := range results {
		r := &results[i]
		if !r.IsLive() {
			continue
		}

		targetURL := strings.TrimSpace(r.FinalURL)
		if targetURL == "" {
			targetURL = strings.TrimSpace(r.URL)
		}
		if targetURL == "" {
			continue
		}

		if _, exists := seen[targetURL]; exists {
			continue
		}
		seen[targetURL] = struct{}{}

		buf.WriteString(targetURL)
		buf.WriteByte('\n')
	}

	return []byte(buf.String()), nil
}