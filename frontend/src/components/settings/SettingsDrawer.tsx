import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Fingerprint,
  Globe,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { ScanConfig } from '../../types/vanguard';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScanConfig;
  onChangeConfig: (updated: ScanConfig) => void;
  onResetDefaults: () => void;
  isScanning: boolean;
}

interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

const PORT_PRESETS: { label: string; ports: number[] }[] = [
  { label: 'Default (80/443)', ports: [] },
  { label: 'Top Web (6)', ports: [80, 443, 8080, 8443, 3000, 8000] },
  {
    label: 'Extended Infra (12)',
    ports: [80, 443, 8000, 8008, 8080, 8081, 8443, 8888, 3000, 5000, 9000, 9090],
  },
];

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'];

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onResetDefaults,
  isScanning,
}) => {
  const [portsText, setPortsText] = useState<string>(config.ports.join(', '));
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([]);

  // Synchronize local ports string and header rows whenever drawer opens or config resets
  useEffect(() => {
    setPortsText(config.ports.join(', '));
    const entries = Object.entries(config.customHeaders || {});
    setHeaderRows(
      entries.map(([key, value], idx) => ({
        id: `hdr-${idx}-${key}`,
        key,
        value,
      }))
    );
  }, [isOpen, config.ports, config.customHeaders]);

  if (!isOpen) return null;

  const updateField = <K extends keyof ScanConfig>(
    field: K,
    value: ScanConfig[K]
  ) => {
    onChangeConfig({
      ...config,
      [field]: value,
    });
  };

  const handlePortsBlurOrApply = (raw: string) => {
    setPortsText(raw);
    const parsed = raw
      .split(/[\s,]+/)
      .map((token) => parseInt(token.trim(), 10))
      .filter((num) => !Number.isNaN(num) && num >= 1 && num <= 65535);
    const uniquePorts = Array.from(new Set(parsed));
    updateField('ports', uniquePorts);
  };

  const applyPortPreset = (ports: number[]) => {
    setPortsText(ports.join(', '));
    updateField('ports', ports);
  };

  const syncHeaderRowsToConfig = (rows: HeaderRow[]) => {
    setHeaderRows(rows);
    const nextHeaders: Record<string, string> = {};
    for (const row of rows) {
      const k = row.key.trim();
      if (k) {
        nextHeaders[k] = row.value;
      }
    }
    updateField('customHeaders', nextHeaders);
  };

  const handleAddHeaderRow = () => {
    syncHeaderRowsToConfig([
      ...headerRows,
      { id: `hdr-${Date.now()}`, key: '', value: '' },
    ]);
  };

  const handleUpdateHeaderRow = (
    id: string,
    field: 'key' | 'value',
    val: string
  ) => {
    const updated = headerRows.map((row) =>
      row.id === id ? { ...row, [field]: val } : row
    );
    syncHeaderRowsToConfig(updated);
  };

  const handleRemoveHeaderRow = (id: string) => {
    syncHeaderRowsToConfig(headerRows.filter((row) => row.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[1px]">
      <div className="relative flex flex-col w-full max-w-xl h-full bg-white dark:bg-cyber-panel border-l border-slate-200 dark:border-cyber-border shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-cyber-border shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Scanner & Probing Configuration
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDefaults}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-cyber-border bg-slate-50 hover:bg-slate-100 dark:bg-cyber-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-cyber-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Locked Notice if Scanning */}
        {isScanning && (
          <div className="px-5 py-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Scan is currently active. Stop the scan to modify engine parameters.
            </span>
          </div>
        )}

        {/* Scrollable Settings Content */}
        <fieldset
          disabled={isScanning}
          className="flex-1 overflow-y-auto p-5 space-y-6 disabled:opacity-70"
        >
          {/* Section 1: Concurrency & Rate Limiting */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>Concurrency & Rate Limiting</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Worker Threads (1 – 1000)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={config.threads}
                  onChange={(e) =>
                    updateField(
                      'threads',
                      Math.max(1, Math.min(1000, Number(e.target.value) || 1))
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rate Limit (Req/Sec, 0 = Max)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={config.rateLimit}
                  onChange={(e) =>
                    updateField(
                      'rateLimit',
                      Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Request Timeout (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={config.timeoutSec}
                  onChange={(e) =>
                    updateField(
                      'timeoutSec',
                      Math.max(1, Math.min(120, Number(e.target.value) || 10))
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Retries on Network Error
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={config.retries}
                  onChange={(e) =>
                    updateField(
                      'retries',
                      Math.max(0, Math.min(5, Number(e.target.value) || 0))
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-cyber-border" />

          {/* Section 2: Ports, Proxy & Protocol Behavior */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Ports, Proxy & Protocol Behavior</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Custom TCP Ports (comma-separated)
                </label>
                <div className="flex items-center gap-1">
                  {PORT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPortPreset(preset.ports)}
                      className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 hover:bg-emerald-500/15 dark:bg-cyber-surface dark:hover:bg-emerald-500/20 text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200 dark:border-cyber-border transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={portsText}
                onChange={(e) => handlePortsBlurOrApply(e.target.value)}
                placeholder="Leave blank for standard 80/443, or enter: 80, 443, 8080, 8443, 3000"
                className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Proxy URL (HTTP / SOCKS5)
                </label>
                <input
                  type="text"
                  value={config.proxyUrl}
                  onChange={(e) => updateField('proxyUrl', e.target.value)}
                  placeholder="http://127.0.0.1:8080"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Custom Path Suffix
                </label>
                <input
                  type="text"
                  value={config.customPath}
                  onChange={(e) => updateField('customPath', e.target.value)}
                  placeholder="/api/health or /.env"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.httpsFallback}
                  onChange={(e) =>
                    updateField('httpsFallback', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>HTTPS &rarr; HTTP Fallback</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.probeBothSchemes}
                  onChange={(e) =>
                    updateField('probeBothSchemes', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Probe Both HTTP & HTTPS</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.followRedirects}
                  onChange={(e) =>
                    updateField('followRedirects', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Follow HTTP Redirects</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.verifySsl}
                  onChange={(e) => updateField('verifySsl', e.target.checked)}
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Strict TLS Verification</span>
              </label>
            </div>

            {config.followRedirects && (
              <div className="w-44">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Redirect Hops
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={config.maxRedirects}
                  onChange={(e) =>
                    updateField(
                      'maxRedirects',
                      Math.max(1, Math.min(25, Number(e.target.value) || 10))
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-cyber-border" />

          {/* Section 3: HTTP Request & Custom Headers */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Send className="w-3.5 h-3.5" />
              <span>HTTP Request & Headers</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  HTTP Method
                </label>
                <select
                  value={config.method}
                  onChange={(e) => updateField('method', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Response Read (KB)
                </label>
                <input
                  type="number"
                  min={64}
                  max={10240}
                  value={config.maxBodySizeKb}
                  onChange={(e) =>
                    updateField(
                      'maxBodySizeKb',
                      Math.max(64, Math.min(10240, Number(e.target.value) || 2048))
                    )
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {(config.method === 'POST' ||
              config.method === 'PUT' ||
              config.method === 'PATCH') && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Request Body Payload
                </label>
                <textarea
                  rows={3}
                  value={config.requestBody}
                  onChange={(e) => updateField('requestBody', e.target.value)}
                  placeholder='{"query":"{__typename}"}'
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* User-Agent Settings */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.randomUserAgent}
                  onChange={(e) =>
                    updateField('randomUserAgent', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Rotate Random Browser User-Agent Pool</span>
              </label>

              {!config.randomUserAgent && (
                <input
                  type="text"
                  value={config.userAgent}
                  onChange={(e) => updateField('userAgent', e.target.value)}
                  placeholder="Custom User-Agent string"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              )}
            </div>

            {/* Custom Headers Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Custom HTTP Headers
                </label>
                <button
                  type="button"
                  onClick={handleAddHeaderRow}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Header</span>
                </button>
              </div>

              {headerRows.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-500 italic">
                  No custom headers configured (e.g., Authorization, Cookie, X-Bug-Bounty).
                </p>
              ) : (
                <div className="space-y-2">
                  {headerRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) =>
                          handleUpdateHeaderRow(row.id, 'key', e.target.value)
                        }
                        placeholder="Header-Name"
                        className="w-2/5 px-2.5 py-1.5 text-xs font-mono rounded bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) =>
                          handleUpdateHeaderRow(row.id, 'value', e.target.value)
                        }
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeaderRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove header"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-cyber-border" />

          {/* Section 4: Fingerprinting Modules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Fingerprinting Modules</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableTechDetect}
                  onChange={(e) =>
                    updateField('enableTechDetect', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Technology Detection</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableDns}
                  onChange={(e) => updateField('enableDns', e.target.checked)}
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>DNS Resolution (A/AAAA/CNAME)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableTls}
                  onChange={(e) => updateField('enableTls', e.target.checked)}
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>TLS / X.509 Certificate Info</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableFavicon}
                  onChange={(e) =>
                    updateField('enableFavicon', e.target.checked)
                  }
                  className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Favicon MMH3 Hash</span>
              </label>
            </div>
          </div>
        </fieldset>

        {/* Drawer Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-surface/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};