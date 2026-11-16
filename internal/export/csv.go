package export

import (
	"bytes"
	"encoding/csv"
	"strconv"
	"strings"

	"vanguard-http/internal/models"
)

// ExportCSV serializes probe results into a UTF-8 BOM-prefixed CSV document
// suitable for spreadsheet tools and data pipelines.
func ExportCSV(results []models.ProbeResult) ([]byte, error) {
	var buf bytes.Buffer
	// Write UTF-8 BOM so Microsoft Excel properly renders Unicode page titles
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(&buf)

	headers := []string{
		"ID",
		"Timestamp",
		"Input",
		"URL",
		"Final URL",
		"Status Code",
		"Status Text",
		"Title",
		"Technologies",
		"Web Server",
		"Powered By",
		"Primary IP",
		"IPv4 Addresses",
		"IPv6 Addresses",
		"CNAME",
		"CDN / WAF",
		"Content Type",
		"Content Length (Bytes)",
		"Words",
		"Lines",
		"Response Time (ms)",
		"TLS Version",
		"TLS Subject CN",
		"TLS Issuer",
		"TLS Expiry",
		"Favicon MMH3",
		"Shodan Favicon Query",
		"Body SHA256",
		"Error",
	}

	if err := writer.Write(headers); err != nil {
		return nil, err
	}

	for i := range results {
		r := &results[i]

		statusCode := ""
		if r.StatusCode > 0 {
			statusCode = strconv.Itoa(r.StatusCode)
		}

		var tlsVer, tlsCN, tlsIssuer, tlsExpiry string
		if r.TLS != nil {
			tlsVer = r.TLS.Version
			tlsCN = r.TLS.SubjectCN
			tlsIssuer = r.TLS.Issuer
			tlsExpiry = r.TLS.NotAfter
		}

		var favMMH3, shodanQuery string
		if r.Favicon != nil {
			favMMH3 = strconv.FormatInt(int64(r.Favicon.MMH3), 10)
			shodanQuery = r.Favicon.ShodanQuery
		}

		row := []string{
			strconv.FormatInt(r.ID, 10),
			r.Timestamp,
			r.Input,
			r.URL,
			r.FinalURL,
			statusCode,
			r.StatusText,
			r.Title,
			r.FormattedTechnologies(),
			r.WebServer,
			r.PoweredBy,
			r.PrimaryIP(),
			strings.Join(r.DNS.A, "; "),
			strings.Join(r.DNS.AAAA, "; "),
			strings.Join(r.DNS.CNAME, "; "),
			r.DNS.CDN,
			r.ContentType,
			strconv.FormatInt(r.ContentLength, 10),
			strconv.Itoa(r.Words),
			strconv.Itoa(r.Lines),
			strconv.FormatInt(r.ResponseTimeMs, 10),
			tlsVer,
			tlsCN,
			tlsIssuer,
			tlsExpiry,
			favMMH3,
			shodanQuery,
			r.BodySHA256,
			r.Error,
		}

		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}