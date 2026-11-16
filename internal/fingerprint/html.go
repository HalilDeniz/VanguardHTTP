package fingerprint

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"strings"
	"unicode/utf8"

	"golang.org/x/net/html"
)

// maxPreviewBytes limits the HTML preview payload sent over Wails IPC to 64 KB
// to keep UI state responsive during high-speed scans.
const maxPreviewBytes = 64 * 1024

// HTMLAnalysis holds structured metadata extracted from an HTTP response body
// in a single pass.
type HTMLAnalysis struct {
	Title         string
	Words         int
	Lines         int
	BodySHA256    string
	BodyPreview   string
	FaviconHref   string
	MetaGenerator string
	ScriptSources []string
}

// AnalyzeHTML inspects a raw HTTP response body, computing line/word metrics,
// SHA-256 digest, UTF-8 safe preview, and HTML head/script indicators.
func AnalyzeHTML(body []byte) HTMLAnalysis {
	if len(body) == 0 {
		return HTMLAnalysis{
			Lines:      0,
			Words:      0,
			BodySHA256: emptySHA256(),
		}
	}

	sum := sha256.Sum256(body)
	hashHex := hex.EncodeToString(sum[:])

	text := string(body)
	lines := countLines(body)
	words := len(strings.Fields(text))
	preview := truncateUTF8(text, maxPreviewBytes)

	analysis := HTMLAnalysis{
		Words:       words,
		Lines:       lines,
		BodySHA256:  hashHex,
		BodyPreview: preview,
	}

	extractHTMLSignals(body, &analysis)
	return analysis
}

// extractHTMLSignals tokenizes HTML to extract <title>, <link rel="icon">,
// <meta name="generator">, and <script src="..."> attributes without building a full DOM tree.
func extractHTMLSignals(body []byte, out *HTMLAnalysis) {
	tokenizer := html.NewTokenizer(bytes.NewReader(body))

	inTitle := false
	var titleBuf strings.Builder
	seenScripts := make(map[string]struct{})

	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			if tokenizer.Err() == io.EOF || out.Title != "" {
				if out.Title == "" && titleBuf.Len() > 0 {
					out.Title = normalizeWhitespace(titleBuf.String())
				}
			}
			return

		case html.StartTagToken, html.SelfClosingTagToken:
			t := tokenizer.Token()
			tagName := strings.ToLower(t.Data)

			switch tagName {
			case "title":
				if tt == html.StartTagToken && out.Title == "" {
					inTitle = true
				}

			case "link":
				if out.FaviconHref == "" {
					rel := strings.ToLower(getAttr(t, "rel"))
					href := strings.TrimSpace(getAttr(t, "href"))
					if href != "" && isIconRel(rel) {
						out.FaviconHref = href
					}
				}

			case "meta":
				if out.MetaGenerator == "" {
					name := strings.ToLower(getAttr(t, "name"))
					if name == "generator" {
						content := strings.TrimSpace(getAttr(t, "content"))
						if content != "" {
							out.MetaGenerator = content
						}
					}
				}

			case "script":
				src := strings.TrimSpace(getAttr(t, "src"))
				if src != "" {
					if _, exists := seenScripts[src]; !exists {
						seenScripts[src] = struct{}{}
						out.ScriptSources = append(out.ScriptSources, src)
					}
				}
			}

		case html.TextToken:
			if inTitle {
				titleBuf.WriteString(tokenizer.Token().Data)
			}

		case html.EndTagToken:
			t := tokenizer.Token()
			if strings.ToLower(t.Data) == "title" && inTitle {
				inTitle = false
				if out.Title == "" {
					out.Title = normalizeWhitespace(titleBuf.String())
				}
			}
		}
	}
}

func getAttr(t html.Token, key string) string {
	for _, attr := range t.Attr {
		if strings.EqualFold(attr.Key, key) {
			return attr.Val
		}
	}
	return ""
}

func isIconRel(rel string) bool {
	if rel == "" {
		return false
	}
	for _, token := range strings.Fields(rel) {
		if token == "icon" || token == "apple-touch-icon" {
			return true
		}
	}
	return false
}

func normalizeWhitespace(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func countLines(b []byte) int {
	if len(b) == 0 {
		return 0
	}
	count := bytes.Count(b, []byte{'\n'})
	if b[len(b)-1] != '\n' {
		count++
	}
	return count
}

func truncateUTF8(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	truncated := s[:maxBytes]
	for len(truncated) > 0 && !utf8.ValidString(truncated) {
		truncated = truncated[:len(truncated)-1]
	}
	return truncated
}

func emptySHA256() string {
	sum := sha256.Sum256(nil)
	return hex.EncodeToString(sum[:])
}