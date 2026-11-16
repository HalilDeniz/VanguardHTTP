import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  ExternalLink,
  Radar,
  SearchX,
} from 'lucide-react';
import {
  ProbeResult,
  SortDirection,
  SortField,
} from '../../types/vanguard';

interface ResultsTableProps {
  results: ProbeResult[];
  totalUnfilteredCount: number;
  selectedResultId: number | null;
  onSelectResult: (result: ProbeResult) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onToggleSort: (field: SortField) => void;
  onCopyURL: (url: string) => void;
  onOpenExternalURL: (url: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getStatusBadgeStyle(statusCode: number, failed: boolean): string {
  if (failed || statusCode <= 0) {
    return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
  }
  if (statusCode >= 200 && statusCode < 300) {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35';
  }
  if (statusCode >= 300 && statusCode < 400) {
    return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35';
  }
  return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35';
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  totalUnfilteredCount,
  selectedResultId,
  onSelectResult,
  sortField,
  sortDirection,
  onToggleSort,
  onCopyURL,
  onOpenExternalURL,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyClick = (e: React.MouseEvent, row: ProbeResult) => {
    e.stopPropagation();
    const targetToCopy = row.finalUrl || row.url;
    onCopyURL(targetToCopy);
    setCopiedId(row.id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === row.id ? null : prev));
    }, 1500);
  };

  const handleExternalClick = (e: React.MouseEvent, row: ProbeResult) => {
    e.stopPropagation();
    onOpenExternalURL(row.finalUrl || row.url);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-500" />
    );
  };

  if (totalUnfilteredCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-cyber-bg select-none">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
          <Radar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Ready for HTTP Reconnaissance
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1.5 leading-relaxed">
          Enter target domains, IP addresses, or CIDR ranges in the left panel—or
          drag and drop a <code className="font-mono text-emerald-600 dark:text-emerald-400">.txt</code> file—then click{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">Start Scan</span> to stream live probing and fingerprinting results.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-cyber-bg select-none">
        <div className="w-12 h-12 rounded-xl bg-slate-200/70 dark:bg-cyber-surface border border-slate-300 dark:border-cyber-border flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Results Match Active Filters
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Adjust your search query, status code filter, or noise-reduction toggles to view hidden entries.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50/40 dark:bg-cyber-bg">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-cyber-surface border-b border-slate-200 dark:border-cyber-border text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 select-none">
          <tr>
            <th className="py-2.5 px-3.5 w-[28%]">
              <button
                type="button"
                onClick={() => onToggleSort('url')}
                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <span>URL</span>
                {renderSortIcon('url')}
              </button>
            </th>
            <th className="py-2.5 px-3 w-[11%]">
              <button
                type="button"
                onClick={() => onToggleSort('statusCode')}
                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <span>Status</span>
                {renderSortIcon('statusCode')}
              </button>
            </th>
            <th className="py-2.5 px-3 w-[21%]">
              <button
                type="button"
                onClick={() => onToggleSort('title')}
                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <span>Page Title</span>
                {renderSortIcon('title')}
              </button>
            </th>
            <th className="py-2.5 px-3 w-[18%]">Technologies</th>
            <th className="py-2.5 px-3 w-[11%]">IP / CNAME</th>
            <th className="py-2.5 px-3 w-[6%] text-right">
              <button
                type="button"
                onClick={() => onToggleSort('contentLength')}
                className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100 ml-auto"
              >
                <span>Size</span>
                {renderSortIcon('contentLength')}
              </button>
            </th>
            <th className="py-2.5 px-3.5 w-[5%] text-right">
              <button
                type="button"
                onClick={() => onToggleSort('responseTimeMs')}
                className="inline-flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-slate-100 ml-auto"
              >
                <span>Time</span>
                {renderSortIcon('responseTimeMs')}
              </button>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200/80 dark:divide-cyber-border/80">
          {results.map((row) => {
            const isSelected = row.id === selectedResultId;
            const primaryIP = row.dns?.a?.[0] || row.dns?.aaaa?.[0] || '';
            const primaryCNAME = row.dns?.cname?.[0] || '';
            const hasRedirected = row.finalUrl && row.finalUrl !== row.url;

            return (
              <tr
                key={row.id}
                onClick={() => onSelectResult(row)}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/12 dark:bg-emerald-500/15'
                    : 'hover:bg-slate-100/90 dark:hover:bg-cyber-surface/65'
                }`}
              >
                {/* URL + Quick Actions */}
                <td className="py-2.5 px-3.5 align-top">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-medium text-sky-700 dark:text-sky-400 break-all leading-snug">
                        {row.url}
                      </div>
                      {hasRedirected && (
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all mt-0.5">
                          &rarr; {row.finalUrl}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyClick(e, row)}
                        title="Copy URL"
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
                      >
                        {copiedId === row.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      {!row.failed && (
                        <button
                          type="button"
                          onClick={(e) => handleExternalClick(e, row)}
                          title="Open in default browser"
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-2.5 px-3 align-top">
                  {row.failed ? (
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold rounded border ${getStatusBadgeStyle(
                          0,
                          true
                        )}`}
                      >
                        FAILED
                      </span>
                      {row.error && (
                        <div
                          title={row.error}
                          className="text-[10px] font-mono text-rose-600 dark:text-rose-400 mt-1 line-clamp-2"
                        >
                          {row.error}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-mono font-bold rounded border whitespace-nowrap ${getStatusBadgeStyle(
                        row.statusCode,
                        false
                      )}`}
                    >
                      {row.statusCode} {row.statusText}
                    </span>
                  )}
                </td>

                {/* Page Title & Server Hint */}
                <td className="py-2.5 px-3 align-top">
                  <div className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                    {row.title || (
                      <span className="text-slate-400 dark:text-slate-600 font-normal">
                        &mdash;
                      </span>
                    )}
                  </div>
                  {(row.webServer || row.poweredBy) && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {[row.webServer, row.poweredBy].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </td>

                {/* Technologies */}
                <td className="py-2.5 px-3 align-top">
                  {row.technologies && row.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.technologies.map((tech) => (
                        <span
                          key={`${row.id}-${tech.name}`}
                          title={`${tech.category} (Confidence: ${tech.confidence}%)`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-200/80 dark:bg-cyber-surface text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-cyber-border"
                        >
                          <span>{tech.name}</span>
                          {tech.version && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {tech.version}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                  )}
                </td>

                {/* IP / CNAME / CDN */}
                <td className="py-2.5 px-3 align-top font-mono text-[11px]">
                  {primaryIP ? (
                    <div className="text-slate-800 dark:text-slate-200">
                      {primaryIP}
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                  )}
                  {row.dns?.cdn && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                      ({row.dns.cdn})
                    </div>
                  )}
                  {primaryCNAME && (
                    <div
                      title={primaryCNAME}
                      className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]"
                    >
                      {primaryCNAME}
                    </div>
                  )}
                </td>

                {/* Content Size */}
                <td className="py-2.5 px-3 align-top text-right font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {row.failed ? '—' : formatBytes(row.contentLength)}
                </td>

                {/* Latency */}
                <td className="py-2.5 px-3.5 align-top text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {row.failed ? '—' : `${row.responseTimeMs} ms`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};