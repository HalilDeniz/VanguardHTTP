<div align="center">

# 🛡️ VanguardHTTP

**High-Performance Cross-Platform HTTP Probing & Deep Fingerprinting Desktop Suite**

[![Version](https://img.shields.io/badge/Version-v1.0.0.0-10b981?style=for-the-badge)](https://github.com/halildeniz/VanguardHTTP/releases)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Wails v2](https://img.shields.io/badge/Wails-v2-DF0000?style=for-the-badge)](https://wails.io/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-1e293b?style=for-the-badge)](#installation--build)
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge)](LICENSE)

</div>


<img width="1917" height="1036" alt="vanguardhttp-v1 0 0-1-" src="https://github.com/user-attachments/assets/52ed70b4-c55f-4c12-8489-f53e6fdb0625" />


## 📖 Overview

**VanguardHTTP** is a modern, cross-platform desktop reconnaissance and attack-surface discovery application built for security researchers, penetration testers, bug bounty hunters, and red teams.

Instead of parsing walls of terminal output or chaining multiple CLI scripts manually, VanguardHTTP streams live HTTP probing and deep fingerprinting telemetry directly into a responsive, filterable desktop workspace—compiled into a single standalone binary with minimal RAM overhead.


## ✨ Key Features

### ⚡ High-Speed Concurrency & Execution Control
- **Configurable Worker Pool:** Scale concurrency dynamically from `1` up to `1,000` worker threads.
- **Precision Rate Limiting:** Built-in token-bucket rate limiter (`golang.org/x/time/rate`) to enforce maximum Requests Per Second (RPS) and avoid WAF bans or target saturation.
- **Full Lifecycle Control:** Safely **Start**, **Pause**, **Resume**, and **Stop** active scans mid-flight without deadlocks or leaked sockets.
- **Real-Time IPC Streaming:** Results stream live via Wails Events (`runtime.EventsEmit`) with micro-batched UI rendering for smooth performance even at high RPS.

### 🌐 Smart Target & Protocol Discovery
- **Automatic Scheme Probing & Fallback:** Automatically tests `https://` with seamless fallback to `http://` (or probes both schemes concurrently) for bare domains and IPs.
- **CIDR Block Expansion:** Automatically resolves IPv4/IPv6 CIDR ranges (e.g., `192.168.1.0/24`) into individual host targets.
- **Custom TCP Port Lists:** Probe standard ports or supply custom port lists and presets (`80, 443, 8080, 8443, 3000, 8000`, etc.).
- **Drag & Drop Target Import:** Paste targets directly or drag-and-drop `.txt`, `.lst`, or `.csv` target lists with automatic deduplication and live endpoint preview counting.

### 🔍 Comprehensive Fingerprinting Engine
- **HTTP Metrics:** Status code with color-coded badges (`2xx`, `3xx`, `4xx`, `5xx`), page `<title>`, `Server` / `X-Powered-By` headers, content size, word/line counts, SHA-256 body hash, and latency (`ms`).
- **Technology Stack Detection:** Embedded Wappalyzer-style JSON ruleset (`go:embed`) identifying Web Servers, CMSs, Frontend/Backend Frameworks, CDNs, WAFs, and DevOps panels with version extraction.
- **DNS & Infrastructure Resolution:** Concurrent `A`, `AAAA`, and `CNAME` lookups with automatic CDN/WAF provider attribution.
- **X.509 / TLS Certificate Inspection:** Extracts TLS version, cipher suite, Subject CN, Issuer, validity dates, expiration countdown, self-signed status, and all Subject Alternative Names (SANs).
- **Shodan-Compatible Favicon Hashing:** Computes RFC-2045 Base64 MurmurHash3 (`MMH3`) and MD5 digests for `/favicon.ico` and HTML-declared icons, generating ready-to-copy `http.favicon.hash:<id>` queries.

### 🛠️ Advanced Request Customization
- **HTTP Methods & Payloads:** Support for `GET`, `HEAD`, `POST`, `OPTIONS`, `PUT`, `PATCH`, and `DELETE` with custom request bodies.
- **Custom Headers & User-Agent Rotation:** Inject arbitrary headers (`Authorization`, `Cookie`, `X-Bug-Bounty`) and toggle between a custom User-Agent or an automated multi-browser User-Agent pool.
- **Proxy Routing:** Full `HTTP`, `HTTPS`, `SOCKS5`, and `SOCKS5H` proxy support for seamless traffic inspection in **Burp Suite** or **OWASP ZAP**.
- **Redirect Chain Tracking:** Configurable redirect following with hop-by-hop status code and `Location` header logging.

### 🖥️ Interactive GUI & Reporting
- **Dark & Light Mode:** Sleek cyber-security Dark Mode by default with instant Light Mode switching.
- **Advanced Filtering & Noise Reduction:** Filter by status category, detected technology, keyword/Regex search, and collapse duplicate responses using **"Hide Similar Sizes"**.
- **Target Inspector Drawer:** Click any row to inspect the **Raw HTTP Request**, **Raw & Parsed Response Headers**, **HTML Source Preview**, **SSL/TLS Certificate**, and **Redirect Chain**.
- **Multi-Format Export:** Export all results or only your filtered subset to **JSON**, **CSV** (UTF-8 BOM), **TXT** (live URLs list for `nuclei`/`ffuf`), or a standalone interactive **HTML Security Report**.

---

## 🚀 Installation & Build

### Prerequisites
- **[Go](https://go.dev/dl/)** `1.22` or higher
- **[Node.js](https://nodejs.org/)** `18+` (LTS)
- **[Wails CLI v2](https://wails.io/docs/gettingstarted/installation)**

Install the Wails v2 CLI and verify your environment:
```bash
go install https://github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

> **Linux Note (Ubuntu/Debian):** Install GTK3 and WebKit2GTK development headers before building:
> ```bash
> sudo apt update && sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
> 
> ```
> 
> 
> *(On Ubuntu 24.04+, install `libwebkit2gtk-4.1-dev` and pass `-tags webkit2_41` to `wails` commands.)*

### Clone & Run in Development Mode

```bash
git clone https://github.com/halildeniz/VanguardHTTP.git
cd VanguardHTTP
go mod tidy
wails dev

```

### Build Production Binaries

* **Windows (`.exe`):**
```bash
wails build -clean -platform windows/amd64 -ldflags "-s -w"
```


Output: `build/bin/VanguardHTTP.exe`
* **macOS (`.app` Universal Binary):**
```bash
wails build -clean -platform darwin/universal -ldflags "-s -w"
```


Output: `build/bin/VanguardHTTP.app`
* **Linux (Binary):**
```bash
wails build -clean -platform linux/amd64 -ldflags "-s -w"
```


Output: `build/bin/VanguardHTTP`

---

### 🏗️ Project Architecture

VanguardHTTP follows a modular Go backend and React/TypeScript frontend architecture powered by Wails v2:

```text
VanguardHTTP/
├── main.go                                 # Wails v2 entry point, window options & lifecycle setup
├── wails.json                              # Wails build, application metadata & frontend config
├── go.mod                                  # Go 1.22+ module & dependency definitions
├── go.sum                                  # Dependency checksums
├── LICENSE                                 # MIT License
├── README.md                               # Project documentation
├── SECURITY.md                             # Responsible disclosure & security policy
│
├── build/                                  # Platform-specific packaging & icon assets
│   ├── appicon.png                         # Master application icon
│   ├── darwin/                             # macOS (.app) Info.plist & .icns assets
│   ├── linux/                              # Linux desktop integration assets
│   └── windows/                            # Windows (.exe) manifest & .ico resources
│
├── internal/                               # Core Go backend packages
│   ├── app/
│   │   └── app.go                          # Bound Wails API methods & real-time EventsEmit bridge
│   │
│   ├── models/                             # Data structures & validation DTOs
│   │   ├── scan_config.go                  # Scan settings, normalization & input validation
│   │   ├── probe_result.go                 # Single-target reconnaissance output (HTTP/DNS/TLS/Tech)
│   │   └── stats.go                        # Real-time telemetry metrics (RPS, progress, counters)
│   │
│   ├── target/                             # Target parsing & normalization layer
│   │   └── parser.go                       # CIDR expansion, custom ports & http/https scheme builder
│   │
│   ├── engine/                             # High-concurrency probing & network engine
│   │   ├── engine.go                       # Worker pool, rate limiter, Pause/Resume/Stop & streamer
│   │   ├── client.go                       # HTTP/SOCKS5 proxy transport, TLS config & redirect tracker
│   │   └── prober.go                       # Request execution, HTTPS->HTTP fallback, retries & safe body read
│   │
│   ├── fingerprint/                        # Modular fingerprinting & analysis engines
│   │   ├── html.go                         # <title> extraction, word/line counts & UTF-8 body preview
│   │   ├── tech.go                         # Header, cookie, HTML & script technology detector
│   │   ├── dns.go                          # Concurrent A, AAAA, CNAME lookup & CDN attribution
│   │   ├── tls.go                          # X.509 certificate chain, CN, Issuer, expiry & SAN parser
│   │   ├── favicon.go                      # Favicon fetcher & Shodan-compatible MMH3 hash calculator
│   │   └── rules/
│   │       └── fingerprints.json           # Embedded (go:embed) Wappalyzer-style detection ruleset
│   │
│   ├── useragent/                          # Request identity management
│   │   └── pool.go                         # Modern multi-browser User-Agent pool & random selector
│   │
│   └── export/                             # Report & data serialization modules
│       ├── exporter.go                     # Unified export manager & file writer
│       ├── json.go                         # Structured full JSON report generator
│       ├── csv.go                          # UTF-8 BOM tabular CSV exporter
│       ├── txt.go                          # Deduplicated live URLs list exporter
│       └── html.go                         # Standalone dark-mode interactive HTML security report
│
└── frontend/                               # React + TypeScript + Tailwind CSS UI
    ├── index.html                          # Main HTML entry template
    ├── package.json                        # Frontend dependencies (lucide-react, tailwindcss, etc.)
    ├── tsconfig.json                       # TypeScript compiler configuration
    ├── vite.config.ts                      # Vite bundler configuration
    ├── tailwind.config.js                  # Dark/Light theme palette & typography settings
    ├── postcss.config.js                   # PostCSS configuration
    │
    ├── wailsjs/                            # Auto-generated Go <-> TypeScript bindings & runtime
    │   ├── go/                             # Bound Go structs and methods
    │   └── runtime/                        # Wails event & window runtime APIs
    │
    └── src/
        ├── main.tsx                        # React root mount
        ├── App.tsx                         # Main 3-pane workspace, filtering, sorting & state orchestrator
        ├── index.css                       # Tailwind directives & custom scrollbar styles
        │
        ├── types/
        │   └── vanguard.ts                 # TypeScript interfaces matching backend models
        │
        ├── hooks/
        │   ├── useScanStream.ts            # Micro-batched (100ms) real-time event stream listener
        │   └── useTheme.ts                 # Dark / Light mode toggle & localStorage persistence
        │
        └── components/
            ├── layout/
            │   ├── Header.tsx              # Top navigation bar, theme switch & import/export triggers
            │   └── DashboardBar.tsx        # Live telemetry metrics, RPS gauge, progress bar & controls
            │
            ├── input/
            │   └── TargetInputPanel.tsx    # Target input area, drag-and-drop .txt loader & counters
            │
            ├── settings/
            │   └── SettingsDrawer.tsx      # Slide-over drawer for threads, RPS, proxy, ports & headers
            │
            ├── results/
            │   ├── FilterBar.tsx           # Status pills, tech filter, regex search & noise reduction
            │   └── ResultsTable.tsx        # Sortable & filterable live reconnaissance results table
            │
            ├── inspector/
            │   └── InspectorDrawer.tsx     # Raw request, headers, HTML source, TLS & redirect inspector
            │
            └── export/
                └── ExportModal.tsx         # Modal for exporting all or filtered results (JSON/CSV/TXT/HTML)
```


## 💬 Feedback & Bug Reports

Have a suggestion, feature request, or encountered a bug?

* Open an issue on the [GitHub Issues](https://github.com/HalilDeniz/VanguardHTTP/blob/main/MIT) page with steps to reproduce, your OS version, and relevant logs.

## ⚖️ Legal Disclaimer

**VanguardHTTP** is developed strictly for authorized security assessments, penetration testing, bug bounty programs, and educational research. Scanning networks or systems without explicit prior permission from the asset owner is illegal. The author assumes no liability for misuse or damage caused by this software.

## 👤 Author & Contact

**Halil İbrahim Deniz**

* 🌐 **Website:** [denizhalil.com](https://denizhalil.com)
* 📧 **Email:** [halildeniz313@gmail.com](mailto:halildeniz313@gmail.com)
* 💼 **LinkedIn:** [linkedin.com/in/halil-ibrahim-deniz](https://www.linkedin.com/in/halil-ibrahim-deniz/)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](https://github.com/HalilDeniz/VanguardHTTP/blob/main/MIT) for full details.
