package engine

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/time/rate"

	"vanguard-http/internal/models"
	"vanguard-http/internal/target"
)

// ResultCallback is invoked in real time whenever a worker finishes probing a target.
type ResultCallback func(result models.ProbeResult)

// StatsCallback is invoked periodically and on lifecycle transitions with live telemetry.
type StatsCallback func(stats models.ScanStats)

// Engine coordinates concurrent HTTP probing, rate limiting, pause/resume/stop
// lifecycle management, and real-time event streaming.
type Engine struct {
	mu          sync.RWMutex
	state       models.ScanState
	cancelFunc  context.CancelFunc
	pauseCh     chan struct{}
	results     []models.ProbeResult
	activeCfg   models.ScanConfig
	startTime   time.Time
	totalTarget int

	// Atomic counters for lock-free worker updates
	scannedCount   atomic.Int64
	respondedCount atomic.Int64
	status2xx      atomic.Int64
	status3xx      atomic.Int64
	status4xx      atomic.Int64
	status5xx      atomic.Int64
	failedCount    atomic.Int64
	activeWorkers  atomic.Int32
	resultSeq      atomic.Int64

	// Sliding window timestamps for instantaneous RPS calculation
	rpsMu      sync.Mutex
	completion []time.Time

	onResult ResultCallback
	onStats  StatsCallback
}

// NewEngine initializes a ready-to-use scanning engine with event callbacks.
func NewEngine(onResult ResultCallback, onStats StatsCallback) *Engine {
	closedGate := make(chan struct{})
	close(closedGate)

	return &Engine{
		state:    models.ScanStateIdle,
		pauseCh:  closedGate,
		results:  make([]models.ProbeResult, 0),
		onResult: onResult,
		onStats:  onStats,
	}
}

// Start validates the configuration, expands targets, spins up the worker pool,
// and begins streaming ProbeResults and ScanStats asynchronously.
func (e *Engine) Start(cfg models.ScanConfig) error {
	if err := cfg.NormalizeAndValidate(); err != nil {
		return err
	}

	e.mu.Lock()
	if e.state == models.ScanStateRunning || e.state == models.ScanStatePaused {
		e.mu.Unlock()
		return errors.New("a scan is already in progress; stop it before starting a new one")
	}

	probeTargets, err := target.ParseTargets(cfg.Targets, cfg)
	if err != nil {
		e.mu.Unlock()
		return err
	}

	httpClient, err := BuildHTTPClient(cfg)
	if err != nil {
		e.mu.Unlock()
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())
	openGate := make(chan struct{})
	close(openGate) // Closed channel allows immediate passage when running

	e.state = models.ScanStateRunning
	e.cancelFunc = cancel
	e.pauseCh = openGate
	e.activeCfg = cfg
	e.startTime = time.Now().UTC()
	e.totalTarget = len(probeTargets)
	e.results = make([]models.ProbeResult, 0, len(probeTargets))

	// Reset telemetry counters
	e.scannedCount.Store(0)
	e.respondedCount.Store(0)
	e.status2xx.Store(0)
	e.status3xx.Store(0)
	e.status4xx.Store(0)
	e.status5xx.Store(0)
	e.failedCount.Store(0)
	e.activeWorkers.Store(0)
	e.resultSeq.Store(0)

	e.rpsMu.Lock()
	e.completion = make([]time.Time, 0, cfg.Threads*2)
	e.rpsMu.Unlock()

	e.mu.Unlock()

	// Emit initial stats snapshot immediately
	e.emitStats()

	go e.runCoordinator(ctx, httpClient, probeTargets, cfg)
	return nil
}

// Pause suspends worker dispatch without tearing down active HTTP connections.
func (e *Engine) Pause() error {
	e.mu.Lock()
	if e.state != models.ScanStateRunning {
		e.mu.Unlock()
		return fmt.Errorf("cannot pause scan while in %q state", e.state)
	}
	// Replace closed channel with an open blocking channel
	e.pauseCh = make(chan struct{})
	e.state = models.ScanStatePaused
	e.mu.Unlock()

	e.emitStats()
	return nil
}

// Resume unblocks paused workers so scanning continues from the remaining queue.
func (e *Engine) Resume() error {
	e.mu.Lock()
	if e.state != models.ScanStatePaused {
		e.mu.Unlock()
		return fmt.Errorf("cannot resume scan while in %q state", e.state)
	}
	close(e.pauseCh)
	e.state = models.ScanStateRunning
	e.mu.Unlock()

	e.emitStats()
	return nil
}

// Stop cancels all in-flight requests and terminates the active scan immediately.
func (e *Engine) Stop() {
	e.mu.Lock()
	if e.state != models.ScanStateRunning && e.state != models.ScanStatePaused {
		e.mu.Unlock()
		return
	}
	cancel := e.cancelFunc
	e.state = models.ScanStateStopped
	e.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	e.emitStats()
}

// State returns the current operational state of the engine.
func (e *Engine) State() models.ScanState {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.state
}

// GetResults returns a thread-safe snapshot copy of all collected ProbeResults.
func (e *Engine) GetResults() []models.ProbeResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	out := make([]models.ProbeResult, len(e.results))
	copy(out, e.results)
	return out
}

// ClearResults resets stored results and returns the engine to idle when not scanning.
func (e *Engine) ClearResults() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.state == models.ScanStateRunning || e.state == models.ScanStatePaused {
		return errors.New("cannot clear results while a scan is active")
	}

	e.results = make([]models.ProbeResult, 0)
	e.totalTarget = 0
	e.scannedCount.Store(0)
	e.respondedCount.Store(0)
	e.status2xx.Store(0)
	e.status3xx.Store(0)
	e.status4xx.Store(0)
	e.status5xx.Store(0)
	e.failedCount.Store(0)
	e.state = models.ScanStateIdle
	return nil
}

// SnapshotStats builds a consistent point-in-time ScanStats struct.
func (e *Engine) SnapshotStats() models.ScanStats {
	e.mu.RLock()
	state := e.state
	total := e.totalTarget
	start := e.startTime
	e.mu.RUnlock()

	scanned := int(e.scannedCount.Load())
	responded := int(e.respondedCount.Load())
	s2xx := int(e.status2xx.Load())
	s3xx := int(e.status3xx.Load())
	s4xx := int(e.status4xx.Load())
	s5xx := int(e.status5xx.Load())
	failed := int(e.failedCount.Load())
	workers := int(e.activeWorkers.Load())

	var progress float64
	if total > 0 {
		progress = (float64(scanned) / float64(total)) * 100.0
		if progress > 100.0 {
			progress = 100.0
		}
	}

	var elapsedMs int64
	var avgRPS float64
	var startStr string
	if !start.IsZero() {
		startStr = start.Format(time.RFC3339)
		elapsed := time.Since(start)
		elapsedMs = elapsed.Milliseconds()
		if elapsed.Seconds() > 0 && scanned > 0 {
			avgRPS = float64(scanned) / elapsed.Seconds()
		}
	}

	currentRPS := 0.0
	if state == models.ScanStateRunning {
		currentRPS = e.calculateInstantRPS()
	}

	return models.ScanStats{
		State:           state,
		TotalTargets:    total,
		ScannedTargets:  scanned,
		RespondedCount:  responded,
		Status2xx:       s2xx,
		Status3xx:       s3xx,
		Status4xx:       s4xx,
		Status5xx:       s5xx,
		FailedCount:     failed,
		CurrentRPS:      currentRPS,
		AverageRPS:      avgRPS,
		ProgressPercent: progress,
		ElapsedMs:       elapsedMs,
		ActiveWorkers:   workers,
		StartTime:       startStr,
	}
}

func (e *Engine) runCoordinator(
	ctx context.Context,
	client *http.Client,
	targets []target.ProbeTarget,
	cfg models.ScanConfig,
) {
	defer client.CloseIdleConnections()

	workerCount := cfg.Threads
	if workerCount > len(targets) {
		workerCount = len(targets)
	}
	if workerCount < 1 {
		workerCount = 1
	}

	var limiter *rate.Limiter
	if cfg.RateLimit > 0 {
		burst := cfg.RateLimit
		if burst > workerCount {
			burst = workerCount
		}
		if burst < 1 {
			burst = 1
		}
		limiter = rate.NewLimiter(rate.Limit(cfg.RateLimit), burst)
	}

	jobs := make(chan target.ProbeTarget, workerCount*2)
	var wg sync.WaitGroup

	// Start periodic telemetry ticker (250ms cadence for smooth UI updates)
	tickerDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(250 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-tickerDone:
				return
			case <-ticker.C:
				e.emitStats()
			}
		}
	}()

	// Launch worker goroutines
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				if err := e.waitIfPaused(ctx); err != nil {
					return
				}

				select {
				case <-ctx.Done():
					return
				case pt, ok := <-jobs:
					if !ok {
						return
					}

					if err := e.waitIfPaused(ctx); err != nil {
						return
					}

					if limiter != nil {
						if err := limiter.Wait(ctx); err != nil {
							return
						}
					}

					e.activeWorkers.Add(1)
					seqID := e.resultSeq.Add(1)
					result := ProbeTarget(ctx, client, pt, cfg, seqID)
					e.activeWorkers.Add(-1)

					// Skip recording partial results if scan was explicitly aborted mid-request
					if ctx.Err() != nil && result.Failed {
						return
					}

					e.recordResult(result)
				}
			}
		}()
	}

	// Feed targets into the job queue until exhausted or canceled
feedLoop:
	for _, pt := range targets {
		if err := e.waitIfPaused(ctx); err != nil {
			break feedLoop
		}
		select {
		case <-ctx.Done():
			break feedLoop
		case jobs <- pt:
		}
	}
	close(jobs)

	// Wait for all workers to finish their current in-flight probes
	wg.Wait()
	close(tickerDone)

	// Finalize lifecycle state
	e.mu.Lock()
	if ctx.Err() != nil {
		e.state = models.ScanStateStopped
	} else if e.state == models.ScanStateRunning || e.state == models.ScanStatePaused {
		e.state = models.ScanStateCompleted
	}
	e.cancelFunc = nil
	e.mu.Unlock()

	e.emitStats()
}

func (e *Engine) waitIfPaused(ctx context.Context) error {
	e.mu.RLock()
	gate := e.pauseCh
	e.mu.RUnlock()

	select {
	case <-gate:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (e *Engine) recordResult(res models.ProbeResult) {
	e.scannedCount.Add(1)
	e.recordCompletionTimestamp()

	if res.IsLive() {
		e.respondedCount.Add(1)
		switch res.StatusCategory() {
		case "2xx":
			e.status2xx.Add(1)
		case "3xx":
			e.status3xx.Add(1)
		case "4xx":
			e.status4xx.Add(1)
		case "5xx":
			e.status5xx.Add(1)
		}
	} else {
		e.failedCount.Add(1)
	}

	e.mu.Lock()
	e.results = append(e.results, res)
	e.mu.Unlock()

	if e.onResult != nil {
		e.onResult(res)
	}
}

func (e *Engine) recordCompletionTimestamp() {
	now := time.Now()
	cutoff := now.Add(-1 * time.Second)

	e.rpsMu.Lock()
	e.completion = append(e.completion, now)
	// Prune timestamps older than 1 second
	idx := 0
	for idx < len(e.completion) && e.completion[idx].Before(cutoff) {
		idx++
	}
	if idx > 0 {
		e.completion = e.completion[idx:]
	}
	e.rpsMu.Unlock()
}

func (e *Engine) calculateInstantRPS() float64 {
	cutoff := time.Now().Add(-1 * time.Second)

	e.rpsMu.Lock()
	defer e.rpsMu.Unlock()

	idx := 0
	for idx < len(e.completion) && e.completion[idx].Before(cutoff) {
		idx++
	}
	if idx > 0 {
		e.completion = e.completion[idx:]
	}
	return float64(len(e.completion))
}

func (e *Engine) emitStats() {
	if e.onStats != nil {
		e.onStats(e.SnapshotStats())
	}
}