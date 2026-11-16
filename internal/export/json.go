package export

import (
	"encoding/json"
	"time"

	"vanguard-http/internal/models"
)

type jsonReportEnvelope struct {
	Tool         string               `json:"tool"`
	GeneratedAt  string               `json:"generatedAt"`
	TotalRecords int                  `json:"totalRecords"`
	LiveRecords  int                  `json:"liveRecords"`
	Results      []models.ProbeResult `json:"results"`
}

// ExportJSON serializes probe results into an indented, self-describing JSON document.
func ExportJSON(results []models.ProbeResult) ([]byte, error) {
	liveCount := 0
	for i := range results {
		if results[i].IsLive() {
			liveCount++
		}
	}

	envelope := jsonReportEnvelope{
		Tool:         "VanguardHTTP",
		GeneratedAt:  time.Now().UTC().Format(time.RFC3339),
		TotalRecords: len(results),
		LiveRecords:  liveCount,
		Results:      results,
	}
	if envelope.Results == nil {
		envelope.Results = []models.ProbeResult{}
	}

	return json.MarshalIndent(envelope, "", "  ")
}