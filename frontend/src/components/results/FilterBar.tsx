import React from 'react';
import {
  CopyMinus,
  EyeOff,
  Filter,
  Regex,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  FilterOptions,
  StatusCategoryFilter,
} from '../../types/vanguard';

interface CategoryCounts {
  all: number;
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
  err: number;
}

interface FilterBarProps {
  filters: FilterOptions;
  onChangeFilters: (next: FilterOptions) => void;
  availableTechnologies: string[];
  categoryCounts: CategoryCounts;
  filteredCount: number;
  totalCount: number;
  regexError: string | null;
}

const STATUS_PILLS: {
  key: StatusCategoryFilter;
  label: string;
  activeClasses: string;
}[] = [
  {
    key: 'all',
    label: 'All',
    activeClasses:
      'bg-slate-800 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200',
  },
  {
    key: '2xx',
    label: '2xx',
    activeClasses:
      'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50',
  },
  {
    key: '3xx',
    label: '3xx',
    activeClasses:
      'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50',
  },
  {
    key: '4xx',
    label: '4xx',
    activeClasses:
      'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50',
  },
  {
    key: '5xx',
    label: '5xx',
    activeClasses:
      'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50',
  },
  {
    key: 'err',
    label: 'Failed',
    activeClasses:
      'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/50',
  },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  availableTechnologies,
  categoryCounts,
  filteredCount,
  totalCount,
  regexError,
}) => {
  const updateField = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onChangeFilters({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.statusCategory !== 'all' ||
    filters.selectedTech !== '' ||
    filters.hideSimilarSizes ||
    filters.hideFailed;

  const handleResetFilters = () => {
    onChangeFilters({
      searchQuery: '',
      useRegex: false,
      statusCategory: 'all',
      selectedTech: '',
      hideSimilarSizes: false,
      hideFailed: false,
    });
  };

  return (
    <div className="flex flex-col gap-2.5 px-4 py-2.5 bg-white dark:bg-cyber-panel border-b border-slate-200 dark:border-cyber-border select-none shrink-0">
      {/* Top Row: Search Input, Regex Toggle, Tech Dropdown & Noise Reduction */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search & Regex Input */}
        <div className="relative flex-1 min-w-[230px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateField('searchQuery', e.target.value)}
            placeholder={
              filters.useRegex
                ? 'Regex filter (e.g. ^https://admin\\.|nginx/1\\.2[0-9])...'
                : 'Search URL, title, tech, IP, CNAME, or header...'
            }
            className={`w-full pl-8 pr-16 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border focus:outline-none transition-colors ${
              regexError
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-slate-300 dark:border-cyber-border focus:border-emerald-500'
            }`}
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => updateField('searchQuery', '')}
                title="Clear search query"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => updateField('useRegex', !filters.useRegex)}
              title="Toggle Regular Expression (Regex) search mode"
              className={`p-1 rounded border text-[10px] font-mono transition-colors ${
                filters.useRegex
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Technology Filter Select */}
        <div className="relative min-w-[175px]">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          <select
            value={filters.selectedTech}
            onChange={(e) => updateField('selectedTech', e.target.value)}
            aria-label="Filter by detected technology"
            className="
              w-full
              pl-8 pr-8 py-2
              text-xs font-medium
              rounded-lg
              appearance-none
              bg-slate-50 dark:bg-[#111827]
              border border-slate-300 dark:border-[#263449]
              text-slate-800 dark:text-slate-200
              hover:border-slate-400 dark:hover:border-slate-600
              focus:border-emerald-500
              focus:ring-1 focus:ring-emerald-500/30
              focus:outline-none
              transition-colors duration-200
              [color-scheme:dark]
            "
          >
            <option value="" className="bg-[#111827] text-slate-200">
              All Technologies ({availableTechnologies.length})
            </option>

            {availableTechnologies.map((tech) => (
              <option
                key={tech}
                value={tech}
                className="bg-[#111827] text-slate-200"
              >
                {tech}
              </option>
            ))}
          </select>
        </div>

        {/* Hide Similar Sizes Toggle (Noise Reduction) */}
        <button
          type="button"
          onClick={() =>
            updateField('hideSimilarSizes', !filters.hideSimilarSizes)
          }
          title="Collapse duplicate responses sharing identical status code and byte size"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            filters.hideSimilarSizes
              ? 'bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface/70 dark:hover:bg-cyber-surface border-slate-300 dark:border-cyber-border text-slate-700 dark:text-slate-300'
          }`}
        >
          <CopyMinus className="w-3.5 h-3.5" />
          <span>Hide Similar Sizes</span>
        </button>

        {/* Hide Failed Probes Toggle */}
        <button
          type="button"
          onClick={() => updateField('hideFailed', !filters.hideFailed)}
          title="Hide unreachable or timed-out targets"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            filters.hideFailed
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
              : 'bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface/70 dark:hover:bg-cyber-surface border-slate-300 dark:border-cyber-border text-slate-700 dark:text-slate-300'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Live Only</span>
        </button>
      </div>

      {/* Regex Syntax Warning */}
      {regexError && (
        <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
          Invalid regular expression: {regexError}
        </div>
      )}

      {/* Bottom Row: Status Code Pills & Filtered Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_PILLS.map((pill) => {
            const isSelected = filters.statusCategory === pill.key;
            const count = categoryCounts[pill.key];
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => updateField('statusCategory', pill.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md border transition-colors ${
                  isSelected
                    ? pill.activeClasses
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface/50 dark:hover:bg-cyber-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-cyber-border'
                }`}
              >
                <span>{pill.label}</span>
                <span className="opacity-80">({count.toLocaleString()})</span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Showing{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {filteredCount.toLocaleString()}
          </span>{' '}
          of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {totalCount.toLocaleString()}
          </span>{' '}
          results
        </div>
      </div>
    </div>
  );
};