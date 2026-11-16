package models

// ScanState represents the operational lifecycle status of the scanning engine.
type ScanState string

const (
	ScanStateIdle      ScanState = "idle"
	ScanStateRunning   ScanState = "running"
	ScanStatePaused    ScanState = "paused"
	ScanStateCompleted ScanState = "completed"
	ScanStateStopped   ScanState = "stopped"
)

// ScanStats holds real-time telemetry metrics streamed to the UI dashboard bar.
type ScanStats struct {
	State           ScanState `json:"state"`
	TotalTargets    int       `json:"totalTargets"`
	ScannedTargets  int       `json:"scannedTargets"`
	RespondedCount  int       `json:"respondedCount"`
	Status2xx       int       `json:"status2xx"`
	Status3xx       int       `json:"status3xx"`
	Status4xx       int       `json:"status4xx"`
	Status5xx       int       `json:"status5xx"`
	FailedCount     int       `json:"failedCount"`
	CurrentRPS      float64   `json:"currentRps"`
	AverageRPS      float64   `json:"averageRps"`
	ProgressPercent float64   `json:"progressPercent"`
	ElapsedMs       int64     `json:"elapsedMs"`
	ActiveWorkers   int       `json:"activeWorkers"`
	StartTime       string    `json:"startTime,omitempty"`
}

// NewInitialStats creates a clean telemetry snapshot prior to starting a scan.
func NewInitialStats(total int) ScanStats {
	return ScanStats{
		State:        ScanStateRunning,
		TotalTargets: total,
	}
}