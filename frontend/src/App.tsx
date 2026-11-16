import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  ExportFormat,
  FALLBACK_CONFIG,
  FilterOptions,
  ProbeResult,
  ScanConfig,
  SortDirection,
  SortField,
  StatusCategoryFilter,
} from './types/vanguard';
import { useTheme } from './hooks/useTheme';
import { useScanStream } from './hooks/useScanStream';
import { Header } from './components/layout/Header';
import { DashboardBar } from './components/layout/DashboardBar';
import { TargetInputPanel } from './components/input/TargetInputPanel';
import { FilterBar } from './components/results/FilterBar';
import { ResultsTable } from './components/results/ResultsTable';
import { InspectorDrawer } from './components/inspector/InspectorDrawer';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { ExportModal } from './components/export/ExportModal';

const INITIAL_FILTERS: FilterOptions = {
  searchQuery: '',
  useRegex: false,
  statusCategory: 'all',
  selectedTech: '',
  hideSimilarSizes: false,
  hideFailed: false,
};

function getStatusCategory(row: ProbeResult): StatusCategoryFilter {
  if (row.failed || row.statusCode <= 0) return 'err';
  if (row.statusCode >= 200 && row.statusCode < 300) return '2xx';
  if (row.statusCode >= 300 && row.statusCode < 400) return '3xx';
  if (row.statusCode >= 400 && row.statusCode < 500) return '4xx';
  if (row.statusCode >= 500 && row.statusCode < 600) return '5xx';
  return 'err';
}

export function App() {
  const { isDark, toggleTheme } = useTheme();
  const {
    results,
    stats,
    errorMessage,
    clearError,
    startScan,
    pauseScan,
    resumeScan,
    stopScan,
    clearResults,
  } = useScanStream();

  // Target & Configuration State
  const [rawTargetInput, setRawTargetInput] = useState<string>('');
  const [config, setConfig] = useState<ScanConfig>(FALLBACK_CONFIG);
  const [expandedEndpointCount, setExpandedEndpointCount] = useState<number>(0);
  const [targetPreviewError, setTargetPreviewError] = useState<string | null>(
    null
  );

  // Drawer & Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);

  // Filtering & Sorting State
  const [filters, setFilters] = useState<FilterOptions>(INITIAL_FILTERS);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const isScanning = stats.state === 'running' || stats.state === 'paused';

  // Load canonical default configuration from Go backend on mount
  useEffect(() => {
    const api = window.go?.app?.App;
    if (!api) return;

    api
      .GetDefaultConfig()
      .then((defaultCfg) => {
        if (defaultCfg) {
          setConfig(defaultCfg);
        }
      })
      .catch(() => {
        // Retain FALLBACK_CONFIG if bridge is initializing
      });
  }, []);

  // Parse non-empty target lines
  const parsedTargetLines = useMemo(() => {
    return rawTargetInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }, [rawTargetInput]);

  // Debounced preview of expanded CIDR / port endpoints
  useEffect(() => {
    if (parsedTargetLines.length === 0) {
      setExpandedEndpointCount(0);
      setTargetPreviewError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const api = window.go?.app?.App;
      if (!api) {
        setExpandedEndpointCount(parsedTargetLines.length);
        setTargetPreviewError(null);
        return;
      }

      api
        .PreviewTargetCount(parsedTargetLines, config)
        .then((count) => {
          setExpandedEndpointCount(count);
          setTargetPreviewError(null);
        })
        .catch((err) => {
          setExpandedEndpointCount(0);
          setTargetPreviewError(
            err instanceof Error ? err.message : String(err)
          );
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    parsedTargetLines,
    config.ports,
    config.probeBothSchemes,
    config.httpsFallback,
    config.customPath,
  ]);

  // Keep selected inspector record synchronized with live results
  const selectedResult = useMemo(() => {
    if (selectedResultId === null) return null;
    return results.find((r) => r.id === selectedResultId) ?? null;
  }, [results, selectedResultId]);

  // Collect sorted unique list of all detected technologies for the filter dropdown
  const availableTechnologies = useMemo(() => {
    const techSet = new Set<string>();
    for (let i = 0; i < results.length; i++) {
      const techs = results[i].technologies;
      if (!techs) continue;
      for (let j = 0; j < techs.length; j++) {
        if (techs[j].name) {
          techSet.add(techs[j].name);
        }
      }
    }
    return Array.from(techSet).sort((a, b) => a.localeCompare(b));
  }, [results]);

  // Compute status category counts across all collected results
  const categoryCounts = useMemo(() => {
    const counts = {
      all: results.length,
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
      err: 0,
    };

    for (let i = 0; i < results.length; i++) {
      const cat = getStatusCategory(results[i]);
      if (cat !== 'all') {
        counts[cat]++;
      }
    }
    return counts;
  }, [results]);

  // Compile optional search RegExp safely
  const { compiledRegex, regexError } = useMemo(() => {
    const q = filters.searchQuery.trim();
    if (!q || !filters.useRegex) {
      return { compiledRegex: null, regexError: null };
    }
    try {
      return { compiledRegex: new RegExp(q, 'i'), regexError: null };
    } catch (err) {
      return {
        compiledRegex: null,
        regexError: err instanceof Error ? err.message : 'Invalid pattern',
      };
    }
  }, [filters.searchQuery, filters.useRegex]);

  // Apply status, technology, search/regex, noise-reduction, and sorting rules
  const filteredAndSortedResults = useMemo(() => {
    const queryLower = filters.searchQuery.trim().toLowerCase();
    const seenSizeSignatures = new Set<string>();

    const filtered = results.filter((row) => {
      if (filters.hideFailed && row.failed) {
        return false;
      }

      if (filters.statusCategory !== 'all') {
        if (getStatusCategory(row) !== filters.statusCategory) {
          return false;
        }
      }

      if (filters.selectedTech) {
        const hasTech = row.technologies?.some(
          (t) => t.name === filters.selectedTech
        );
        if (!hasTech) {
          return false;
        }
      }

      if (queryLower) {
        const searchableBlob = [
          row.url,
          row.finalUrl,
          row.title,
          row.webServer,
          row.poweredBy,
          row.error || '',
          ...(row.dns?.a || []),
          ...(row.dns?.aaaa || []),
          ...(row.dns?.cname || []),
          row.dns?.cdn || '',
          ...(row.technologies?.map((t) =>
            t.version ? `${t.name} ${t.version}` : t.name
          ) || []),
        ].join(' ');

        if (filters.useRegex) {
          if (compiledRegex && !compiledRegex.test(searchableBlob)) {
            return false;
          }
        } else if (!searchableBlob.toLowerCase().includes(queryLower)) {
          return false;
        }
      }

      // Noise reduction: collapse duplicate responses with identical statusCode + contentLength
      if (filters.hideSimilarSizes && !row.failed) {
        const signature = `${row.statusCode}:${row.contentLength}`;
        if (seenSizeSignatures.has(signature)) {
          return false;
        }
        seenSizeSignatures.add(signature);
      }

      return true;
    });

    const sorted = filtered.slice().sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'id':
          cmp = a.id - b.id;
          break;
        case 'url':
          cmp = a.url.localeCompare(b.url);
          break;
        case 'statusCode':
          cmp = (a.failed ? -1 : a.statusCode) - (b.failed ? -1 : b.statusCode);
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'contentLength':
          cmp = a.contentLength - b.contentLength;
          break;
        case 'responseTimeMs':
          cmp = a.responseTimeMs - b.responseTimeMs;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [results, filters, compiledRegex, sortField, sortDirection]);

  // Handlers
  const handleStartScan = useCallback(async () => {
    if (parsedTargetLines.length === 0 || targetPreviewError) return;
    setSelectedResultId(null);
    await startScan({
      ...config,
      targets: parsedTargetLines,
    });
  }, [parsedTargetLines, targetPreviewError, config, startScan]);

  const handleClearResults = useCallback(async () => {
    setSelectedResultId(null);
    await clearResults();
  }, [clearResults]);

  const handleImportTargets = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) return;
    try {
      const content = await api.ImportTargetsFromDialog();
      if (content && content.trim()) {
        setRawTargetInput((prev) =>
          prev.trim() ? `${prev.trim()}\n${content.trim()}` : content.trim()
        );
      }
    } catch {
      // User canceled or file dialog failed
    }
  }, []);

  const handleResetDefaults = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) {
      setConfig(FALLBACK_CONFIG);
      return;
    }
    try {
      const defaults = await api.GetDefaultConfig();
      setConfig(defaults);
    } catch {
      setConfig(FALLBACK_CONFIG);
    }
  }, []);

  const handleToggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  const handleCopyText = useCallback((text: string) => {
    const api = window.go?.app?.App;
    if (api) {
      api.CopyToClipboard(text).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, []);

  const handleOpenExternalURL = useCallback((url: string) => {
    const api = window.go?.app?.App;
    if (api) {
      api.OpenExternalURL(url).catch(() => {});
    }
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat, exportAll: boolean): Promise<string | null> => {
      const api = window.go?.app?.App;
      if (!api) {
        throw new Error('Wails backend bridge is unavailable.');
      }
      const savedPath = await api.ExportResults(
        format,
        filteredAndSortedResults,
        exportAll
      );
      return savedPath || null;
    },
    [filteredAndSortedResults]
  );

  const canStart =
    !isScanning &&
    parsedTargetLines.length > 0 &&
    expandedEndpointCount > 0 &&
    !targetPreviewError;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-slate-100">
      {/* Top Application Header */}
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onImportTargets={handleImportTargets}
        onOpenExport={() => setIsExportOpen(true)}
        onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
        onClearResults={handleClearResults}
        isSettingsOpen={isSettingsOpen}
        resultsCount={results.length}
        isScanning={isScanning}
      />

      {/* Real-Time Telemetry & Execution Control Bar */}
      <DashboardBar
        stats={stats}
        previewTargetCount={expandedEndpointCount}
        canStart={canStart}
        onStart={handleStartScan}
        onPause={pauseScan}
        onResume={resumeScan}
        onStop={stopScan}
      />

      {/* Global Runtime Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-rose-500/15 border-b border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded hover:bg-rose-500/20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 3-Pane Workspace */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Target Input & Drag-and-Drop Panel */}
        <TargetInputPanel
          rawInput={rawTargetInput}
          onRawInputChange={setRawTargetInput}
          rawLineCount={parsedTargetLines.length}
          expandedEndpointCount={expandedEndpointCount}
          targetPreviewError={targetPreviewError}
          config={config}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onImportDialog={handleImportTargets}
          isScanning={isScanning}
        />

        {/* Center: Filter Bar + Live Results Table */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <FilterBar
            filters={filters}
            onChangeFilters={setFilters}
            availableTechnologies={availableTechnologies}
            categoryCounts={categoryCounts}
            filteredCount={filteredAndSortedResults.length}
            totalCount={results.length}
            regexError={regexError}
          />

          <ResultsTable
            results={filteredAndSortedResults}
            totalUnfilteredCount={results.length}
            selectedResultId={selectedResultId}
            onSelectResult={(row) =>
              setSelectedResultId((prev) => (prev === row.id ? null : row.id))
            }
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleSort={handleToggleSort}
            onCopyURL={handleCopyText}
            onOpenExternalURL={handleOpenExternalURL}
          />
        </div>

        {/* Right: Target Inspector Drawer */}
        <InspectorDrawer
          result={selectedResult}
          onClose={() => setSelectedResultId(null)}
          onCopyText={handleCopyText}
          onOpenExternalURL={handleOpenExternalURL}
        />
      </main>

      {/* Slide-Over Scanner Configuration Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onChangeConfig={setConfig}
        onResetDefaults={handleResetDefaults}
        isScanning={isScanning}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        totalResultsCount={results.length}
        filteredResultsCount={filteredAndSortedResults.length}
        onExport={handleExport}
      />
    </div>
  );
}

export default App;