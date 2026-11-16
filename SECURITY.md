# Security Policy

## Supported Versions

Security updates and patches are actively maintained for the latest major release of **VanguardHTTP**:

| Version | Supported |
| :--- | :---: |
| `v1.0.x` | :white_check_mark: |
| `< v1.0.0` | :x: |

---

## Reporting a Vulnerability

We take the security of **VanguardHTTP** seriously. If you discover a security vulnerability—such as a memory corruption issue, IPC bridge bypass, arbitrary file write, or cross-site scripting (XSS) vulnerability in the WebView UI or HTML report generator—please report it responsibly.

**Please do NOT disclose security vulnerabilities via public GitHub Issues or Pull Requests.**

### How to Report
Send a detailed report via email to:
- **Email:** [halildeniz313@gmail.com](mailto:halildeniz313@gmail.com)
- **Subject Line:** `[SECURITY] VanguardHTTP Vulnerability Report - <Brief Summary>`

### What to Include in Your Report
To help us triage and remediate the issue quickly, please include:
1. **Description:** A clear explanation of the vulnerability and its potential security impact.
2. **Reproduction Steps:** Step-by-step instructions, sample target inputs, or a Proof of Concept (PoC) to reproduce the behavior.
3. **Environment Details:** VanguardHTTP version, operating system (Windows, macOS, or Linux), and architecture (`amd64` / `arm64`).
4. **Suggested Remediation (Optional):** Any recommendations for fixing or mitigating the issue.

---

## Response Timeline

- **Initial Acknowledgment:** Within **48 hours** of receiving your report.
- **Triage & Assessment:** Within **5 business days**, we will confirm the vulnerability and communicate an estimated remediation timeline.
- **Patch & Disclosure:** Once a fix is verified and released, we will publish a security advisory and credit the researcher (unless anonymity is requested).

---

## Operational Security & Scope Notice

- **VanguardHTTP** is a security reconnaissance tool designed to probe external targets. Issues arising solely from intentional user-configured actions against authorized targets (such as disabling TLS certificate verification via `VerifySSL: false`) are expected operational behavior and not considered vulnerabilities in the application itself.
- Vulnerabilities affecting the local host system running VanguardHTTP (e.g., malicious server responses triggering code execution or XSS in the desktop UI or exported HTML reports) are strictly **in scope**.

---

## Contact

- **Maintainer:** Halil İbrahim Deniz
- **Website:** [denizhalil.com](https://denizhalil.com)
- **Email:** [halildeniz313@gmail.com](mailto:halildeniz313@gmail.com)
