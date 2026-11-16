import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import { ExportFormat } from '../../types/vanguard';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalResultsCount: number;
  filteredResultsCount: number;
  onExport: (format: ExportFormat, exportAll: boolean) => Promise<string | null>;
}

const FORMAT_OPTIONS: {
  format: ExportFormat;
  title: string;
  extension: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    format: 'json',
    title: 'JSON Full Dataset',
    extension: '.json',
    description:
      'Complete structured output including headers, DNS records, TLS certs, Favicon MMH3, and raw artifacts.',
    icon: <FileJson className="w-5 h-5 text-amber-500" />,
  },
  {
    format: 'csv',
    title: 'CSV Spreadsheet',
    extension: '.csv',
    description:
      'UTF-8 BOM tabular export compatible with Microsoft Excel, LibreOffice, and data pipelines.',
    icon: <FileSpreadsheet className="w-5 h-5 text-emerald-500" />,
  },
  {
    format: 'txt',
    title: 'Live URLs List',
    extension: '.txt',
    description:
      'Deduplicated newline-separated list of live HTTP/HTTPS URLs ready for nuclei, ffuf, or katana.',
    icon: <FileText className="w-5 h-5 text-sky-500" />,
  },
  {
    format: 'html',
    title: 'HTML Security Report',
    extension: '.html',
    description:
      'Standalone dark-mode report with built-in search and status code filtering for team sharing.',
    icon: <FileCode2 className="w-5 h-5 text-violet-500" />,
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  totalResultsCount,
  filteredResultsCount,
  onExport,
}) => {
  const [exportAll, setExportAll] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetCount = exportAll ? totalResultsCount : filteredResultsCount;

  const handleFormatClick = async (format: ExportFormat) => {
    if (isExporting || targetCount === 0) return;

    setIsExporting(true);
    setExportError(null);
    setSavedPath(null);

    try {
      const path = await onExport(format, exportAll);
      if (path) {
        setSavedPath(path);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[1px]">
      <div className="w-full max-w-xl rounded-xl bg-white dark:bg-cyber-panel border border-slate-200 dark:border-cyber-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-cyber-border">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Export Reconnaissance Results
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-cyber-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Select Export Scope
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportAll(false)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  !exportAll
                    ? 'bg-emerald-500/12 border-emerald-500/50 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-cyber-surface/50 border-slate-200 dark:border-cyber-border text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Filtered Results Only</div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {filteredResultsCount.toLocaleString()} records
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportAll(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  exportAll
                    ? 'bg-emerald-500/12 border-emerald-500/50 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-cyber-surface/50 border-slate-200 dark:border-cyber-border text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">All Scan Results</div>
                <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                  {totalResultsCount.toLocaleString()} records
                </div>
              </button>
            </div>
          </div>

          {/* Format Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Choose Output Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  type="button"
                  disabled={isExporting || targetCount === 0}
                  onClick={() => handleFormatClick(opt.format)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 hover:bg-slate-100 dark:bg-cyber-surface/40 dark:hover:bg-cyber-surface hover:border-emerald-500/50 text-left transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <div className="mt-0.5 shrink-0">{opt.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {opt.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {opt.extension}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Notices */}
          {savedPath && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold">Export Saved Successfully</div>
                <div className="font-mono text-[11px] break-all mt-0.5 opacity-90">
                  {savedPath}
                </div>
              </div>
            </div>
          )}

          {exportError && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-mono">
              {exportError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-surface/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-cyber-border bg-white hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};