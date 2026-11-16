package export

import (
	"bytes"
	"html/template"
	"strings"
	"time"

	"vanguard-http/internal/models"
)

type htmlReportData struct {
	GeneratedAt string
	TotalCount  int
	LiveCount   int
	Count2xx    int
	Count3xx    int
	Count4xx    int
	Count5xx    int
	FailedCount int
	Rows        []htmlReportRow
}

type htmlReportRow struct {
	URL            string
	FinalURL       string
	ShowFinalURL   bool
	StatusCode     int
	StatusText     string
	StatusClass    string
	Title          string
	Technologies   []string
	PrimaryIP      string
	CNAME          string
	SizeHuman      string
	ResponseTimeMs int64
	TLSIssuer      string
	TLSExpiry      string
	TLSExpired     bool
	FaviconMMH3    string
	Failed         bool
	Error          string
}

const htmlReportTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VanguardHTTP Reconnaissance Report</title>
<style>
  :root {
    --bg: #090d16;
    --panel: #0f1623;
    --surface: #161f30;
    --border: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #10b981;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
    padding: 24px;
    line-height: 1.5;
  }
  .container { max-width: 1480px; margin: 0 auto; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 24px;
    margin-bottom: 20px;
  }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .brand span { color: var(--accent); }
  .meta { color: var(--muted); font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
  }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; font-family: ui-monospace, monospace; }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
    align-items: center;
  }
  .search-input {
    flex: 1;
    min-width: 260px;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 9px 14px;
    border-radius: 7px;
    font-size: 13px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }
  .filter-btn {
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 8px 13px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .filter-btn.active, .filter-btn:hover {
    background: var(--surface);
    color: var(--text);
    border-color: var(--accent);
  }
  .table-wrap {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow-x: auto;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
  th {
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }
  .url-link { color: #38bdf8; text-decoration: none; font-family: ui-monospace, monospace; word-break: break-all; }
  .url-link:hover { text-decoration: underline; }
  .sub-text { display: block; font-size: 11px; color: var(--muted); margin-top: 2px; font-family: ui-monospace, monospace; }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    font-family: ui-monospace, monospace;
  }
  .st-2xx { background: rgba(16, 185, 129, 0.16); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); }
  .st-3xx { background: rgba(59, 130, 246, 0.16); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35); }
  .st-4xx { background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
  .st-5xx { background: rgba(239, 68, 68, 0.16); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); }
  .st-err { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
  .tech-tag {
    display: inline-block;
    background: var(--surface);
    border: 1px solid var(--border);
    color: #cbd5e1;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 11px;
    margin: 1px 3px 1px 0;
  }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <div class="brand">Vanguard<span>HTTP</span> &mdash; Reconnaissance Report</div>
    </div>
    <div class="meta">Generated: {{.GeneratedAt}}</div>
  </header>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Total Probed</div><div class="stat-value">{{.TotalCount}}</div></div>
    <div class="stat-card"><div class="stat-label">Live Services</div><div class="stat-value" style="color:#34d399">{{.LiveCount}}</div></div>
    <div class="stat-card"><div class="stat-label">2xx OK</div><div class="stat-value" style="color:#34d399">{{.Count2xx}}</div></div>
    <div class="stat-card"><div class="stat-label">3xx Redirect</div><div class="stat-value" style="color:#60a5fa">{{.Count3xx}}</div></div>
    <div class="stat-card"><div class="stat-label">4xx Client Err</div><div class="stat-value" style="color:#fbbf24">{{.Count4xx}}</div></div>
    <div class="stat-card"><div class="stat-label">5xx Server Err</div><div class="stat-value" style="color:#f87171">{{.Count5xx}}</div></div>
  </div>

  <div class="toolbar">
    <input type="text" id="searchBox" class="search-input" placeholder="Search URL, page title, technology, IP, or CNAME..." oninput="applyFilters()">
    <button class="filter-btn active" onclick="setCategory('all', this)">All ({{.TotalCount}})</button>
    <button class="filter-btn" onclick="setCategory('2xx', this)">2xx ({{.Count2xx}})</button>
    <button class="filter-btn" onclick="setCategory('3xx', this)">3xx ({{.Count3xx}})</button>
    <button class="filter-btn" onclick="setCategory('4xx', this)">4xx ({{.Count4xx}})</button>
    <button class="filter-btn" onclick="setCategory('5xx', this)">5xx ({{.Count5xx}})</button>
    <button class="filter-btn" onclick="setCategory('err', this)">Failed ({{.FailedCount}})</button>
  </div>

  <div class="table-wrap">
    <table id="resultsTable">
      <thead>
        <tr>
          <th>Target URL</th>
          <th>Status</th>
          <th>Page Title</th>
          <th>Technologies</th>
          <th>IP / CNAME</th>
          <th>TLS / Favicon</th>
          <th>Size</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        {{range .Rows}}
        <tr data-cat="{{.StatusClass}}">
          <td>
            <a class="url-link" href="{{.URL}}" target="_blank" rel="noopener noreferrer">{{.URL}}</a>
            {{if .ShowFinalURL}}<span class="sub-text">&rarr; {{.FinalURL}}</span>{{end}}
          </td>
          <td>
            {{if .Failed}}
              <span class="badge st-err">FAILED</span>
              <span class="sub-text">{{.Error}}</span>
            {{else}}
              <span class="badge st-{{.StatusClass}}">{{.StatusCode}} {{.StatusText}}</span>
            {{end}}
          </td>
          <td>{{if .Title}}{{.Title}}{{else}}<span class="sub-text">&mdash;</span>{{end}}</td>
          <td>
            {{range .Technologies}}<span class="tech-tag">{{.}}</span>{{end}}
          </td>
          <td class="mono">
            {{if .PrimaryIP}}{{.PrimaryIP}}{{else}}&mdash;{{end}}
            {{if .CNAME}}<span class="sub-text">{{.CNAME}}</span>{{end}}
          </td>
          <td class="mono">
            {{if .TLSIssuer}}<div>{{.TLSIssuer}}</div><span class="sub-text">Exp: {{.TLSExpiry}}</span>{{end}}
            {{if .FaviconMMH3}}<span class="sub-text">MMH3: {{.FaviconMMH3}}</span>{{end}}
          </td>
          <td class="mono">{{.SizeHuman}}</td>
          <td class="mono">{{.ResponseTimeMs}} ms</td>
        </tr>
        {{end}}
      </tbody>
    </table>
  </div>
</div>

<script>
  let activeCategory = 'all';
  function setCategory(cat, btn) {
    activeCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  }
  function applyFilters() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const rows = document.querySelectorAll('#resultsTable tbody tr');
    rows.forEach(row => {
      const cat = row.getAttribute('data-cat');
      const text = row.innerText.toLowerCase();
      const matchesCat = (activeCategory === 'all') || (cat === activeCategory);
      const matchesQuery = !query || text.includes(query);
      row.style.display = (matchesCat && matchesQuery) ? '' : 'none';
    });
  }
</script>
</body>
</html>`

// ExportHTML renders a standalone, XSS-safe dark-mode HTML reconnaissance report.
func ExportHTML(results []models.ProbeResult) ([]byte, error) {
	tmpl, err := template.New("report").Parse(htmlReportTemplate)
	if err != nil {
		return nil, err
	}

	data := htmlReportData{
		GeneratedAt: time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
		TotalCount:  len(results),
		Rows:        make([]htmlReportRow, 0, len(results)),
	}

	for i := range results {
		r := &results[i]
		cat := r.StatusCategory()

		if r.IsLive() {
			data.LiveCount++
			switch cat {
			case "2xx":
				data.Count2xx++
			case "3xx":
				data.Count3xx++
			case "4xx":
				data.Count4xx++
			case "5xx":
				data.Count5xx++
			}
		} else {
			data.FailedCount++
		}

		var tlsIssuer, tlsExpiry string
		var tlsExpired bool
		if r.TLS != nil {
			tlsIssuer = r.TLS.Issuer
			tlsExpiry = r.TLS.NotAfter
			tlsExpired = r.TLS.Expired
		}

		var favHash string
		if r.Favicon != nil {
			favHash = formatInt32(r.Favicon.MMH3)
		}

		data.Rows = append(data.Rows, htmlReportRow{
			URL:            r.URL,
			FinalURL:       r.FinalURL,
			ShowFinalURL:   r.FinalURL != "" && r.FinalURL != r.URL,
			StatusCode:     r.StatusCode,
			StatusText:     r.StatusText,
			StatusClass:    cat,
			Title:          r.Title,
			Technologies:   r.TechNames(),
			PrimaryIP:      r.PrimaryIP(),
			CNAME:          strings.Join(r.DNS.CNAME, ", "),
			SizeHuman:      r.HumanSize(),
			ResponseTimeMs: r.ResponseTimeMs,
			TLSIssuer:      tlsIssuer,
			TLSExpiry:      tlsExpiry,
			TLSExpired:     tlsExpired,
			FaviconMMH3:    favHash,
			Failed:         r.Failed,
			Error:          r.Error,
		})
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func formatInt32(n int32) string {
	return template.HTMLEscapeString(intToString(int64(n)))
}

func intToString(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var digits [20]byte
	pos := len(digits)
	for n > 0 {
		pos--
		digits[pos] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		pos--
		digits[pos] = '-'
	}
	return string(digits[pos:])
}