package fingerprint

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"

	"vanguard-http/internal/models"
)

//go:embed rules/fingerprints.json
var embeddedRulesJSON []byte

type rawRuleSet struct {
	Technologies []rawTechRule `json:"technologies"`
}

type rawTechRule struct {
	Name          string            `json:"name"`
	Category      string            `json:"category"`
	Headers       map[string]string `json:"headers,omitempty"`
	Cookies       []string          `json:"cookies,omitempty"`
	HTML          []string          `json:"html,omitempty"`
	Scripts       []string          `json:"scripts,omitempty"`
	MetaGenerator string            `json:"metaGenerator,omitempty"`
	Implies       []string          `json:"implies,omitempty"`
}

type compiledHeaderRule struct {
	headerName string
	pattern    *regexp.Regexp
}

type compiledTechRule struct {
	name          string
	category      string
	headers       []compiledHeaderRule
	cookies       []string
	htmlPatterns  []*regexp.Regexp
	scriptRegexes []*regexp.Regexp
	metaRegex     *regexp.Regexp
	implies       []string
}

var (
	compileOnce   sync.Once
	compiledRules []compiledTechRule
	rulesByName   map[string]compiledTechRule
)

func loadCompiledRules() ([]compiledTechRule, map[string]compiledTechRule) {
	compileOnce.Do(func() {
		var rawSet rawRuleSet
		if err := json.Unmarshal(embeddedRulesJSON, &rawSet); err != nil {
			panic(fmt.Sprintf("fingerprint: failed to parse embedded rules JSON: %v", err))
		}

		compiledRules = make([]compiledTechRule, 0, len(rawSet.Technologies))
		rulesByName = make(map[string]compiledTechRule, len(rawSet.Technologies))

		for _, raw := range rawSet.Technologies {
			rule := compiledTechRule{
				name:     raw.Name,
				category: raw.Category,
				implies:  raw.Implies,
			}

			for hdrKey, hdrPattern := range raw.Headers {
				re, err := regexp.Compile(hdrPattern)
				if err != nil {
					panic(fmt.Sprintf("fingerprint: invalid header regex in rule %q (%s): %v", raw.Name, hdrKey, err))
				}
				rule.headers = append(rule.headers, compiledHeaderRule{
					headerName: strings.ToLower(strings.TrimSpace(hdrKey)),
					pattern:    re,
				})
			}

			for _, cookieName := range raw.Cookies {
				trimmed := strings.ToLower(strings.TrimSpace(cookieName))
				if trimmed != "" {
					rule.cookies = append(rule.cookies, trimmed)
				}
			}

			for _, htmlPat := range raw.HTML {
				re, err := regexp.Compile(htmlPat)
				if err != nil {
					panic(fmt.Sprintf("fingerprint: invalid html regex in rule %q: %v", raw.Name, err))
				}
				rule.htmlPatterns = append(rule.htmlPatterns, re)
			}

			for _, scriptPat := range raw.Scripts {
				re, err := regexp.Compile(scriptPat)
				if err != nil {
					panic(fmt.Sprintf("fingerprint: invalid script regex in rule %q: %v", raw.Name, err))
				}
				rule.scriptRegexes = append(rule.scriptRegexes, re)
			}

			if raw.MetaGenerator != "" {
				re, err := regexp.Compile(raw.MetaGenerator)
				if err != nil {
					panic(fmt.Sprintf("fingerprint: invalid metaGenerator regex in rule %q: %v", raw.Name, err))
				}
				rule.metaRegex = re
			}

			compiledRules = append(compiledRules, rule)
			rulesByName[strings.ToLower(rule.name)] = rule
		}
	})

	return compiledRules, rulesByName
}

// DetectTechnologies inspects HTTP response headers, cookies, HTML content,
// script paths, and meta tags against the embedded Wappalyzer-style ruleset.
func DetectTechnologies(
	headers http.Header,
	body []byte,
	htmlMeta HTMLAnalysis,
	detectedCDN string,
) []models.TechMatch {
	rules, lookupMap := loadCompiledRules()

	normalizedHeaders := make(map[string][]string, len(headers))
	for k, vals := range headers {
		normalizedHeaders[strings.ToLower(k)] = vals
	}

	cookieNames := extractCookieNames(normalizedHeaders["set-cookie"])
	bodyText := string(body)

	matched := make(map[string]models.TechMatch)

	recordMatch := func(name, category, version string, confidence int) {
		key := strings.ToLower(name)
		existing, exists := matched[key]
		if !exists {
			matched[key] = models.TechMatch{
				Name:       name,
				Category:   category,
				Version:    version,
				Confidence: confidence,
			}
			return
		}
		// Upgrade confidence and fill version if newly discovered
		if confidence > existing.Confidence {
			existing.Confidence = confidence
		}
		if existing.Version == "" && version != "" {
			existing.Version = version
		}
		matched[key] = existing
	}

	// Include CDN already identified via DNS CNAME resolution
	if detectedCDN != "" {
		cat := "CDN"
		if rule, ok := lookupMap[strings.ToLower(detectedCDN)]; ok {
			cat = rule.category
		}
		recordMatch(detectedCDN, cat, "", 100)
	}

	for _, rule := range rules {
		confidence := 0
		version := ""

		// 1. Evaluate HTTP Response Headers
		for _, hRule := range rule.headers {
			vals, ok := normalizedHeaders[hRule.headerName]
			if !ok {
				continue
			}
			for _, val := range vals {
				if submatches := hRule.pattern.FindStringSubmatch(val); submatches != nil {
					confidence += 50
					if version == "" && len(submatches) > 1 && submatches[1] != "" {
						version = strings.TrimSpace(submatches[1])
					}
					break
				}
			}
		}

		// 2. Evaluate Set-Cookie names
		for _, expectedCookie := range rule.cookies {
			for _, actualCookie := range cookieNames {
				if actualCookie == expectedCookie || strings.HasPrefix(actualCookie, expectedCookie) {
					confidence += 50
					break
				}
			}
		}

		// 3. Evaluate <meta name="generator">
		if rule.metaRegex != nil && htmlMeta.MetaGenerator != "" {
			if submatches := rule.metaRegex.FindStringSubmatch(htmlMeta.MetaGenerator); submatches != nil {
				confidence += 75
				if version == "" && len(submatches) > 1 && submatches[1] != "" {
					version = strings.TrimSpace(submatches[1])
				}
			}
		}

		// 4. Evaluate <script src="..."> URLs
		for _, sRegex := range rule.scriptRegexes {
			for _, src := range htmlMeta.ScriptSources {
				if submatches := sRegex.FindStringSubmatch(src); submatches != nil {
					confidence += 50
					if version == "" && len(submatches) > 1 && submatches[1] != "" {
						version = strings.TrimSpace(submatches[1])
					}
					break
				}
			}
		}

		// 5. Evaluate HTML Body patterns
		if bodyText != "" {
			for _, bRegex := range rule.htmlPatterns {
				if submatches := bRegex.FindStringSubmatch(bodyText); submatches != nil {
					confidence += 50
					if version == "" && len(submatches) > 1 && submatches[1] != "" {
						version = strings.TrimSpace(submatches[1])
					}
				}
			}
		}

		if confidence > 0 {
			if confidence > 100 {
				confidence = 100
			}
			recordMatch(rule.name, rule.category, version, confidence)

			// Propagate implied stack dependencies (e.g., WordPress -> PHP, Next.js -> React)
			for _, impliedName := range rule.implies {
				impliedRule, ok := lookupMap[strings.ToLower(impliedName)]
				if ok {
					recordMatch(impliedRule.name, impliedRule.category, "", 80)
				} else {
					recordMatch(impliedName, "Technology", "", 80)
				}
			}
		}
	}

	results := make([]models.TechMatch, 0, len(matched))
	for _, item := range matched {
		results = append(results, item)
	}

	// Deterministic sort: highest confidence first, then alphabetical
	sort.Slice(results, func(i, j int) bool {
		if results[i].Confidence != results[j].Confidence {
			return results[i].Confidence > results[j].Confidence
		}
		return results[i].Name < results[j].Name
	})

	return results
}

func extractCookieNames(setCookieHeaders []string) []string {
	if len(setCookieHeaders) == 0 {
		return nil
	}
	names := make([]string, 0, len(setCookieHeaders))
	for _, headerVal := range setCookieHeaders {
		parts := strings.SplitN(headerVal, ";", 2)
		if len(parts) == 0 {
			continue
		}
		kv := strings.SplitN(parts[0], "=", 2)
		name := strings.ToLower(strings.TrimSpace(kv[0]))
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}