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

---

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

## 🤝 Contributing

Contributions, feature ideas, and new technology fingerprint signatures are welcome!

1. **Fork** the repository.
2. **Create** a new feature or fix branch:
```bash
git checkout -b feature/amazing-fingerprint
```


3. **Commit** your changes with clear, descriptive messages:
```bash
git commit -m "feat: add new WAF detection signatures"
```


4. **Push** to your branch:
```bash
git push origin feature/amazing-fingerprint
```


5. Open a **Pull Request** describing your changes and testing steps.


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
