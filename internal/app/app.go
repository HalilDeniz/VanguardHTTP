package app

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"vanguard-http/internal/engine"
	"vanguard-http/internal/export"
	"vanguard-http/internal/models"
	"vanguard-http/internal/target"
)

const (
	EventScanResult    = "scan:result"
	EventScanStats     = "scan:stats"
	maxTargetFileBytes = 10 * 1024 * 1024 // 10 MB cap for imported target files
)

// App exposes VanguardHTTP's backend capabilities to the Wails frontend.
type App struct {
	mu     sync.RWMutex
	ctx    context.Context
	engine *engine.Engine
}

// NewApp creates a new VanguardHTTP application controller and wires real-time
// engine callbacks to Wails runtime events.
func NewApp() *App {
	application := &App{}

	application.engine = engine.NewEngine(
		func(res models.ProbeResult) {
			if ctx := application.getContext(); ctx != nil {
				runtime.EventsEmit(ctx, EventScanResult, res)
			}
		},
		func(stats models.ScanStats) {
			if ctx := application.getContext(); ctx != nil {
				runtime.EventsEmit(ctx, EventScanStats, stats)
			}
		},
	)

	return application
}

// Startup is invoked by Wails when the desktop window is initialized.
func (a *App) Startup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()
}

// Shutdown gracefully halts any active probes before the application exits.
func (a *App) Shutdown(ctx context.Context) {
	if a.engine != nil {
		a.engine.Stop()
	}
}

func (a *App) getContext() context.Context {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.ctx
}

// GetDefaultConfig returns the baseline ScanConfig used to initialize UI controls.
func (a *App) GetDefaultConfig() models.ScanConfig {
	return models.DefaultScanConfig()
}

// PreviewTargetCount calculates the exact number of deduplicated HTTP/HTTPS
// endpoints that will be probed for the current target list and port/scheme settings.
func (a *App) PreviewTargetCount(rawTargets []string, cfg models.ScanConfig) (int, error) {
	if len(rawTargets) == 0 {
		return 0, nil
	}
	return target.CountTargets(rawTargets, cfg)
}

// StartScan validates parameters and initiates an asynchronous reconnaissance scan.
func (a *App) StartScan(cfg models.ScanConfig) error {
	return a.engine.Start(cfg)
}

// PauseScan temporarily suspends worker dispatch while preserving scan state.
func (a *App) PauseScan() error {
	return a.engine.Pause()
}

// ResumeScan resumes a previously paused reconnaissance scan.
func (a *App) ResumeScan() error {
	return a.engine.Resume()
}

// StopScan immediately cancels all in-flight network requests and ends the scan.
func (a *App) StopScan() {
	a.engine.Stop()
}

// GetScanStats returns the latest telemetry snapshot from the engine.
func (a *App) GetScanStats() models.ScanStats {
	return a.engine.SnapshotStats()
}

// GetAllResults returns all probe results collected during the current session.
func (a *App) GetAllResults() []models.ProbeResult {
	return a.engine.GetResults()
}

// ClearResults clears stored probe results when no scan is running.
func (a *App) ClearResults() error {
	return a.engine.ClearResults()
}

// ImportTargetsFromDialog opens a native OS file picker for .txt/.lst target files
// and returns the sanitized file contents.
func (a *App) ImportTargetsFromDialog() (string, error) {
	ctx := a.getContext()
	if ctx == nil {
		return "", errors.New("application context is not initialized")
	}

	selectedPath, err := runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title: "Select Target List File",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Text & Target Lists (*.txt, *.lst, *.csv)",
				Pattern:     "*.txt;*.lst;*.csv",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("file dialog error: %w", err)
	}
	if selectedPath == "" {
		return "", nil
	}

	return a.ReadTargetFile(selectedPath)
}

// ReadTargetFile reads a local target list file safely within the maximum size cap.
func (a *App) ReadTargetFile(filePath string) (string, error) {
	cleaned := strings.TrimSpace(filePath)
	if cleaned == "" {
		return "", errors.New("file path cannot be empty")
	}

	f, err := os.Open(cleaned)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, maxTargetFileBytes))
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(data), nil
}

// ExportResults opens a native save dialog and writes either all scan results or
// the UI's currently filtered subset in JSON, CSV, TXT, or HTML format.
func (a *App) ExportResults(format string, filteredSubset []models.ProbeResult, exportAll bool) (string, error) {
	ctx := a.getContext()
	if ctx == nil {
		return "", errors.New("application context is not initialized")
	}

	parsedFormat, err := export.ParseFormat(format)
	if err != nil {
		return "", err
	}

	records := filteredSubset
	if exportAll {
		records = a.engine.GetResults()
	}
	if len(records) == 0 {
		return "", errors.New("no probe results available to export")
	}

	filter := buildExportDialogFilter(parsedFormat)
	savePath, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		Title:           fmt.Sprintf("Export Results as %s", strings.ToUpper(string(parsedFormat))),
		DefaultFilename: export.DefaultFilename(parsedFormat),
		Filters:         []runtime.FileFilter{filter},
	})
	if err != nil {
		return "", fmt.Errorf("save dialog error: %w", err)
	}
	if savePath == "" {
		return "", nil
	}

	expectedExt := "." + string(parsedFormat)
	if filepath.Ext(savePath) == "" {
		savePath += expectedExt
	}

	if err := export.SaveToFile(savePath, parsedFormat, records); err != nil {
		return "", err
	}

	return savePath, nil
}

// CopyToClipboard writes text into the operating system clipboard.
func (a *App) CopyToClipboard(text string) error {
	ctx := a.getContext()
	if ctx == nil {
		return errors.New("application context is not initialized")
	}
	return runtime.ClipboardSetText(ctx, text)
}

// OpenExternalURL opens a validated http:// or https:// URL in the default browser.
func (a *App) OpenExternalURL(rawURL string) error {
	ctx := a.getContext()
	if ctx == nil {
		return errors.New("application context is not initialized")
	}

	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("refusing to open non-HTTP scheme %q", parsed.Scheme)
	}

	runtime.BrowserOpenURL(ctx, parsed.String())
	return nil
}

func buildExportDialogFilter(format export.Format) runtime.FileFilter {
	switch format {
	case export.FormatJSON:
		return runtime.FileFilter{DisplayName: "JSON Report (*.json)", Pattern: "*.json"}
	case export.FormatCSV:
		return runtime.FileFilter{DisplayName: "CSV Spreadsheet (*.csv)", Pattern: "*.csv"}
	case export.FormatTXT:
		return runtime.FileFilter{DisplayName: "Live URLs Text (*.txt)", Pattern: "*.txt"}
	case export.FormatHTML:
		return runtime.FileFilter{DisplayName: "HTML Security Report (*.html)", Pattern: "*.html"}
	default:
		return runtime.FileFilter{DisplayName: "All Files (*.*)", Pattern: "*.*"}
	}
}