import React from 'react';
import {
  Activity,
  CheckCircle2,
  Gauge,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import { ScanStats } from '../../types/vanguard';

interface DashboardBarProps {
  stats: ScanStats;
  previewTargetCount: number;
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const DashboardBar: React.FC<DashboardBarProps> = ({
  stats,
  previewTargetCount,
  canStart,
  onStart,
  onPause,
  onResume,
  onStop,
}) => {
  const isRunning = stats.state === 'running';
  const isPaused = stats.state === 'paused';
  const isActive = isRunning || isPaused;

  const displayTotal =
    stats.state === 'idle' ? previewTargetCount : stats.totalTargets;
  const pct = Math.min(100, Math.max(0, stats.progressPercent));

  const stateBadgeConfig: Record<
    ScanStats['state'],
    { label: string; classes: string }
  > = {
    idle: {
      label: 'READY',
      classes:
        'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    },
    running: {
      label: 'SCANNING',
      classes:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 animate-pulse',
    },
    paused: {
      label: 'PAUSED',
      classes:
        'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
    },
    completed: {
      label: 'COMPLETED',
      classes:
        'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
    },
    stopped: {
      label: 'STOPPED',
      classes:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
    },
  };

  const badge = stateBadgeConfig[stats.state];

  return (
    <section className="relative bg-white dark:bg-cyber-panel border-b border-slate-200 dark:border-cyber-border px-4 py-3 select-none shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Live Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-0">
          {/* Total Targets */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-cyber-surface/70 border border-slate-200/80 dark:border-cyber-border">
            <div className="p-2 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Total Endpoints
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
                {displayTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Scanned Progress */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-cyber-surface/70 border border-slate-200/80 dark:border-cyber-border">
            <div className="p-2 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Scanned
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {stats.scannedTargets.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  / {displayTotal.toLocaleString()} ({pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Live / 200 OK Services */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-cyber-surface/70 border border-slate-200/80 dark:border-cyber-border">
            <div className="p-2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Live (2xx / All)
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {stats.status2xx.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  / {stats.respondedCount.toLocaleString()} live
                </span>
              </div>
            </div>
          </div>

          {/* Speed & Workers */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-cyber-surface/70 border border-slate-200/80 dark:border-cyber-border">
            <div className="p-2 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Throughput
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {stats.currentRps.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  RPS ({stats.activeWorkers}w • {formatDuration(stats.elapsedMs)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Execution Controls & Status Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider rounded border ${badge.classes}`}
          >
            {badge.label}
          </span>

          {!isActive ? (
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wide uppercase rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/30 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Scan</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  type="button"
                  onClick={onPause}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-wide uppercase rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-wide uppercase rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold tracking-wide uppercase rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Progress Track */}
      <div className="mt-2.5 w-full h-1.5 bg-slate-200 dark:bg-slate-800/90 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ease-out rounded-full ${
            isPaused
              ? 'bg-amber-500'
              : stats.state === 'stopped'
              ? 'bg-rose-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
};