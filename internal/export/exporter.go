package export

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"vanguard-http/internal/models"
)

// Format identifies a supported report export format.
type Format string

const (
	FormatJSON Format = "json"
	FormatCSV  Format = "csv"
	FormatTXT  Format = "txt"
	FormatHTML Format = "html"
)

// ParseFormat normalizes a format string and validates that it is supported.
func ParseFormat(raw string) (Format, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "json":
		return FormatJSON, nil
	case "csv":
		return FormatCSV, nil
	case "txt":
		return FormatTXT, nil
	case "html":
		return FormatHTML, nil
	default:
		return "", fmt.Errorf("unsupported export format %q: must be json, csv, txt, or html", raw)
	}
}

// DefaultFilename builds a timestamped filename for the chosen format.
func DefaultFilename(format Format) string {
	stamp := time.Now().UTC().Format("20060102_150405")
	return fmt.Sprintf("VanguardHTTP_%s.%s", stamp, string(format))
}

// ExportToBytes serializes the given ProbeResult slice into the requested format.
func ExportToBytes(format Format, results []models.ProbeResult) ([]byte, error) {
	switch format {
	case FormatJSON:
		return ExportJSON(results)
	case FormatCSV:
		return ExportCSV(results)
	case FormatTXT:
		return ExportTXT(results)
	case FormatHTML:
		return ExportHTML(results)
	default:
		return nil, fmt.Errorf("unsupported export format %q", format)
	}
}

// SaveToFile serializes results and writes them safely to the destination path.
func SaveToFile(filePath string, format Format, results []models.ProbeResult) error {
	if strings.TrimSpace(filePath) == "" {
		return fmt.Errorf("destination file path cannot be empty")
	}

	payload, err := ExportToBytes(format, results)
	if err != nil {
		return err
	}

	dir := filepath.Dir(filePath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("failed to create output directory: %w", err)
		}
	}

	if err := os.WriteFile(filePath, payload, 0o644); err != nil {
		return fmt.Errorf("failed to write export file: %w", err)
	}

	return nil
}