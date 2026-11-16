package fingerprint

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"slices"
	"strings"
	"time"

	"vanguard-http/internal/models"
)

// ExtractTLSInfo parses an active TLS ConnectionState into a structured TLSInfo
// summary containing protocol metadata and leaf X.509 certificate details.
func ExtractTLSInfo(state *tls.ConnectionState) *models.TLSInfo {
	if state == nil || len(state.PeerCertificates) == 0 {
		return nil
	}

	leaf := state.PeerCertificates[0]
	now := time.Now().UTC()

	notBefore := leaf.NotBefore.UTC()
	notAfter := leaf.NotAfter.UTC()

	daysRemaining := int(notAfter.Sub(now).Hours() / 24)
	isExpired := now.After(notAfter) || now.Before(notBefore)
	isSelfSigned := bytes.Equal(leaf.RawIssuer, leaf.RawSubject)

	subjectCN := strings.TrimSpace(leaf.Subject.CommonName)
	if subjectCN == "" {
		subjectCN = leaf.Subject.String()
	}

	issuer := formatIssuer(leaf)
	sans := extractSANs(leaf)

	serialHex := ""
	if leaf.SerialNumber != nil {
		serialHex = fmt.Sprintf("%X", leaf.SerialNumber)
	}

	return &models.TLSInfo{
		Version:         formatTLSVersion(state.Version),
		CipherSuite:     tls.CipherSuiteName(state.CipherSuite),
		SubjectCN:       subjectCN,
		Issuer:          issuer,
		NotBefore:       notBefore.Format("2006-01-02 15:04:05 UTC"),
		NotAfter:        notAfter.Format("2006-01-02 15:04:05 UTC"),
		DaysUntilExpiry: daysRemaining,
		Expired:         isExpired,
		SelfSigned:      isSelfSigned,
		SANs:            sans,
		SerialNumber:    serialHex,
	}
}

// formatTLSVersion maps Go crypto/tls version constants to human-readable labels.
func formatTLSVersion(version uint16) string {
	switch version {
	case tls.VersionTLS13:
		return "TLS 1.3"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS10:
		return "TLS 1.0"
	default:
		return fmt.Sprintf("Unknown (0x%04x)", version)
	}
}

// formatIssuer constructs a clean, readable certificate authority string.
func formatIssuer(cert *x509.Certificate) string {
	org := ""
	if len(cert.Issuer.Organization) > 0 {
		org = strings.TrimSpace(cert.Issuer.Organization[0])
	}
	cn := strings.TrimSpace(cert.Issuer.CommonName)

	switch {
	case org != "" && cn != "" && org != cn:
		return fmt.Sprintf("%s (%s)", org, cn)
	case cn != "":
		return cn
	case org != "":
		return org
	default:
		return cert.Issuer.String()
	}
}

// extractSANs gathers all DNS names and IP addresses listed in the certificate's
// Subject Alternative Name extension without duplicates.
func extractSANs(cert *x509.Certificate) []string {
	sans := make([]string, 0, len(cert.DNSNames)+len(cert.IPAddresses))

	for _, dnsName := range cert.DNSNames {
		cleaned := strings.TrimSpace(dnsName)
		if cleaned != "" && !slices.Contains(sans, cleaned) {
			sans = append(sans, cleaned)
		}
	}

	for _, ip := range cert.IPAddresses {
		ipStr := ip.String()
		if ipStr != "" && !slices.Contains(sans, ipStr) {
			sans = append(sans, ipStr)
		}
	}

	return sans
}