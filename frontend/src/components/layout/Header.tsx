import React from 'react';
import {
  Download,
  Moon,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onImportTargets: () => void;
  onOpenExport: () => void;
  onToggleSettings: () => void;
  onClearResults: () => void;
  isSettingsOpen: boolean;
  resultsCount: number;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onImportTargets,
  onOpenExport,
  onToggleSettings,
  onClearResults,
  isSettingsOpen,
  resultsCount,
  isScanning,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-cyber-panel border-b border-slate-200 dark:border-cyber-border select-none shrink-0">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm">
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Vanguard<span className="text-emerald-600 dark:text-emerald-400">HTTP</span>
          </h1>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-100 dark:bg-cyber-surface text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-cyber-border">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Right: Primary Workspace Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onImportTargets}
          disabled={isScanning}
          title="Import target domains, IPs, or CIDRs from a file"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Import Targets (.txt)</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={resultsCount === 0}
          title="Export all or filtered results to JSON, CSV, TXT, or HTML"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Export</span>
          {resultsCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              {resultsCount}
            </span>
          )}
        </button>

        {resultsCount > 0 && !isScanning && (
          <button
            type="button"
            onClick={onClearResults}
            title="Clear current scan results"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-rose-50 dark:bg-cyber-surface dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 dark:bg-cyber-border mx-0.5" />

        <button
          type="button"
          onClick={onToggleSettings}
          title="Configure scanner concurrency, proxy, custom ports, and headers"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            isSettingsOpen
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};