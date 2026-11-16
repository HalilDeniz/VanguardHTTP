import React, { useCallback, useState } from 'react';
import {
  AlertCircle,
  FileText,
  FolderOpen,
  ListFilter,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { ScanConfig } from '../../types/vanguard';

interface TargetInputPanelProps {
  rawInput: string;
  onRawInputChange: (value: string) => void;
  rawLineCount: number;
  expandedEndpointCount: number;
  targetPreviewError: string | null;
  config: ScanConfig;
  onOpenSettings: () => void;
  onImportDialog: () => void;
  isScanning: boolean;
}

export const TargetInputPanel: React.FC<TargetInputPanelProps> = ({
  rawInput,
  onRawInputChange,
  rawLineCount,
  expandedEndpointCount,
  targetPreviewError,
  config,
  onOpenSettings,
  onImportDialog,
  isScanning,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isScanning && !isDraggingOver) {
        setIsDraggingOver(true);
      }
    },
    [isScanning, isDraggingOver]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (isScanning) return;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const loadedChunks: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const text = await file.text();
          if (text.trim()) {
            loadedChunks.push(text.trim());
          }
        } catch {
          // Skip unreadable binary drops
        }
      }

      if (loadedChunks.length > 0) {
        const combined = loadedChunks.join('\n');
        const nextValue = rawInput.trim()
          ? `${rawInput.trim()}\n${combined}`
          : combined;
        onRawInputChange(nextValue);
        setDropNotice(
          `Loaded ${files.length} file${files.length > 1 ? 's' : ''}`
        );
        window.setTimeout(() => setDropNotice(null), 2500);
      }
    },
    [isScanning, rawInput, onRawInputChange]
  );

  const handleDeduplicate = () => {
    const lines = rawInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const unique = Array.from(new Set(lines));
    onRawInputChange(unique.join('\n'));
  };

  const handleClear = () => {
    onRawInputChange('');
  };

  return (
    <aside
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col w-80 xl:w-96 shrink-0 bg-white dark:bg-cyber-panel border-r border-slate-200 dark:border-cyber-border select-none"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-cyber-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Target Scope
          </span>
        </div>

        <div className="flex items-center gap-1">
          {rawLineCount > 1 && !isScanning && (
            <button
              type="button"
              onClick={handleDeduplicate}
              title="Remove duplicate target lines"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-cyber-surface transition-colors"
            >
              <ListFilter className="w-3 h-3" />
              <span>Dedupe</span>
            </button>
          )}
          {rawInput.length > 0 && !isScanning && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear target input"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative flex-1 flex flex-col p-3 min-h-0">
        <textarea
          value={rawInput}
          onChange={(e) => onRawInputChange(e.target.value)}
          disabled={isScanning}
          spellCheck={false}
          placeholder={`Enter targets (one per line):\nexample.com\nhttps://app.example.com:8443\n192.168.1.0/24\n10.0.0.15:8080`}
          className="flex-1 w-full resize-none rounded-lg p-3 font-mono text-xs leading-relaxed bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-200 dark:border-cyber-border focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-60"
        />

        {/* Drag & Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-3 rounded-lg bg-emerald-950/85 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-center p-4 pointer-events-none z-10">
            <UploadCloud className="w-9 h-9 text-emerald-400 mb-2 animate-bounce" />
            <p className="text-sm font-bold text-emerald-200">
              Drop Target File Here
            </p>
            <p className="text-xs text-emerald-300/80 mt-1">
              Supports .txt, .lst, or .csv lists
            </p>
          </div>
        )}
      </div>

      {/* Drop Zone Footer & Target Counter */}
      <div className="px-3 pb-3 space-y-2.5">
        <button
          type="button"
          onClick={onImportDialog}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-cyber-surface/40 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>
            {dropNotice
              ? dropNotice
              : 'Drag & drop .txt file or click to browse'}
          </span>
        </button>

        {/* Validation Warning */}
        {targetPreviewError && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] leading-snug">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words">{targetPreviewError}</span>
          </div>
        )}

        {/* Counters Box */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-100/80 dark:bg-cyber-surface/70 border border-slate-200 dark:border-cyber-border">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Input Lines
            </div>
            <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
              {rawLineCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Probe Endpoints
            </div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {expandedEndpointCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Active Profile Quick Summary Pill */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface/60 dark:hover:bg-cyber-surface border border-slate-200 dark:border-cyber-border text-[11px] text-slate-600 dark:text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-mono truncate">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              {config.method} • {config.threads}T •{' '}
              {config.rateLimit > 0 ? `${config.rateLimit} RPS` : 'Max RPS'}
            </span>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 ml-2">
            Configure &rarr;
          </span>
        </button>
      </div>
    </aside>
  );
};