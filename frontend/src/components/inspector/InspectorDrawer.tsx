import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  GitBranch,
  Globe,
  Hash,
  Layers,
  Lock,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ProbeResult } from '../../types/vanguard';

interface InspectorDrawerProps {
  result: ProbeResult | null;
  onClose: () => void;
  onCopyText: (text: string) => void;
  onOpenExternalURL: (url: string) => void;
}

type InspectorTab =
  | 'overview'
  | 'headers'
  | 'request'
  | 'html'
  | 'tls'
  | 'redirects';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} B)`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} B)`;
  }
  return `${bytes} B`;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  result,
  onClose,
  onCopyText,
  onOpenExternalURL,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (result && activeTab === 'tls' && !result.tls) {
      setActiveTab('overview');
    }
  }, [result, activeTab]);

  if (!result) return null;

  const triggerCopy = (key: string, value: string) => {
    onCopyText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  const redirectCount = result.redirectChain?.length || 0;
  const headerEntries = Object.entries(result.responseHeaders || {}).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const tabs: {
    id: InspectorTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'headers',
      label: 'Headers',
      icon: <FileCode className="w-3.5 h-3.5" />,
      badge: headerEntries.length || undefined,
    },
    {
      id: 'request',
      label: 'Raw Request',
      icon: <Send className="w-3.5 h-3.5" />,
    },
    {
      id: 'html',
      label: 'HTML Source',
      icon: <Code2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'tls',
      label: 'TLS / SSL',
      icon: <Lock className="w-3.5 h-3.5" />,
      disabled: !result.tls,
    },
    {
      id: 'redirects',
      label: 'Redirects',
      icon: <GitBranch className="w-3.5 h-3.5" />,
      badge: redirectCount > 0 ? redirectCount : undefined,
    },
  ];

  return (
    <aside className="flex flex-col w-[440px] xl:w-[520px] shrink-0 bg-white dark:bg-cyber-panel border-l border-slate-200 dark:border-cyber-border overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-cyber-border bg-slate-50/80 dark:bg-cyber-surface/50 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Target Inspector
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              #{result.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h3
              title={result.finalUrl || result.url}
              className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {result.finalUrl || result.url}
            </h3>
            <button
              type="button"
              onClick={() => triggerCopy('header-url', result.finalUrl || result.url)}
              title="Copy URL"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0"
            >
              {copiedKey === 'header-url' ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            {!result.failed && (
              <button
                type="button"
                onClick={() => onOpenExternalURL(result.finalUrl || result.url)}
                title="Open in default browser"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close Inspector"
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-cyber-surface transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-panel overflow-x-auto shrink-0 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-cyber-surface border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {result.failed && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Probe Failed</span>
                </div>
                <p className="font-mono text-[11px] break-words">
                  {result.error || 'Target did not respond'}
                </p>
              </div>
            )}

            {/* HTTP Summary Card */}
            <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                HTTP Summary
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 font-mono text-[11px]">
                <div>
                  <span className="block text-[10px] text-slate-400">Status</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {result.failed
                      ? 'Unreachable'
                      : `${result.statusCode} ${result.statusText}`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Latency</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {result.responseTimeMs} ms
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Content Length
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatBytes(result.contentLength)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Words / Lines
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {result.words.toLocaleString()}w / {result.lines.toLocaleString()}l
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400">
                    Page Title
                  </span>
                  <span className="font-sans font-medium text-slate-900 dark:text-slate-100 break-words">
                    {result.title || '—'}
                  </span>
                </div>
                {result.contentType && (
                  <div className="col-span-2">
                    <span className="block text-[10px] text-slate-400">
                      Content-Type
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 break-all">
                      {result.contentType}
                    </span>
                  </div>
                )}
                {result.bodySha256 && (
                  <div className="col-span-2">
                    <span className="block text-[10px] text-slate-400">
                      Body SHA-256
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                        {result.bodySha256}
                      </span>
                      <button
                        type="button"
                        onClick={() => triggerCopy('sha256', result.bodySha256)}
                        className="p-0.5 text-slate-400 hover:text-emerald-400 shrink-0"
                        title="Copy SHA-256"
                      >
                        {copiedKey === 'sha256' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detected Technologies */}
            <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Technology Stack ({result.technologies?.length || 0})
              </div>
              {result.technologies && result.technologies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.technologies.map((t) => (
                    <div
                      key={t.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-[11px]"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {t.name}
                      </span>
                      {t.version && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          v{t.version}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        ({t.category})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No technology signatures matched.
                </p>
              )}
            </div>

            {/* DNS & Network Info */}
            <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Globe className="w-3.5 h-3.5" />
                <span>DNS & Infrastructure</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {result.dns?.cdn && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">CDN / WAF:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {result.dns.cdn}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400 shrink-0">IPv4 (A):</span>
                  <span className="text-slate-800 dark:text-slate-200 text-right break-all">
                    {result.dns?.a?.length ? result.dns.a.join(', ') : '—'}
                  </span>
                </div>
                {result.dns?.aaaa?.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">IPv6 (AAAA):</span>
                    <span className="text-slate-800 dark:text-slate-200 text-right break-all">
                      {result.dns.aaaa.join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400 shrink-0">CNAME:</span>
                  <span className="text-slate-800 dark:text-slate-200 text-right break-all">
                    {result.dns?.cname?.length ? result.dns.cname.join(', ') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Favicon MMH3 Hash */}
            {result.favicon && (
              <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Favicon Fingerprint</span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">MMH3 Hash:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {result.favicon.mmh3}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">MD5:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {result.favicon.md5}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="block text-[10px] text-slate-400 mb-1">
                      Shodan Dork Query:
                    </span>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                      <code className="text-emerald-600 dark:text-emerald-400 truncate">
                        {result.favicon.shodanQuery}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          triggerCopy('shodan', result.favicon!.shodanQuery)
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-slate-200 dark:bg-cyber-surface dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
                      >
                        {copiedKey === 'shodan' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: RESPONSE HEADERS */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Raw Response Headers
              </span>
              {result.rawResponseHeaders && (
                <button
                  type="button"
                  onClick={() =>
                    triggerCopy('raw-resp-hdrs', result.rawResponseHeaders)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-cyber-border bg-slate-50 dark:bg-cyber-surface text-slate-700 dark:text-slate-200"
                >
                  {copiedKey === 'raw-resp-hdrs' ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Raw</span>
                </button>
              )}
            </div>

            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {result.rawResponseHeaders || 'No response headers captured.'}
            </pre>

            {headerEntries.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-cyber-border overflow-hidden">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-100 dark:bg-cyber-surface text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-1.5 px-2.5 w-1/3">Header</th>
                      <th className="py-1.5 px-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-cyber-border">
                    {headerEntries.map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-1.5 px-2.5 font-semibold text-emerald-700 dark:text-emerald-400 align-top break-all">
                          {k}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-700 dark:text-slate-300 align-top break-all">
                          {v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW REQUEST */}
        {activeTab === 'request' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Dispatched HTTP Request
              </span>
              {result.rawRequest && (
                <button
                  type="button"
                  onClick={() => triggerCopy('raw-req', result.rawRequest)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-cyber-border bg-slate-50 dark:bg-cyber-surface text-slate-700 dark:text-slate-200"
                >
                  {copiedKey === 'raw-req' ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Request</span>
                </button>
              )}
            </div>

            <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {result.rawRequest || 'No raw request recorded.'}
            </pre>
          </div>
        )}

        {/* TAB 4: HTML SOURCE PREVIEW */}
        {activeTab === 'html' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Response Body Preview (Up to 64 KB)
              </span>
              {result.bodyPreview && (
                <button
                  type="button"
                  onClick={() => triggerCopy('html-src', result.bodyPreview)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-cyber-border bg-slate-50 dark:bg-cyber-surface text-slate-700 dark:text-slate-200"
                >
                  {copiedKey === 'html-src' ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Body</span>
                </button>
              )}
            </div>

            <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all max-h-[560px]">
              {result.bodyPreview || 'Empty response body.'}
            </pre>
          </div>
        )}

        {/* TAB 5: SSL / TLS CERTIFICATE */}
        {activeTab === 'tls' && result.tls && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35">
                <ShieldCheck className="w-3.5 h-3.5" />
                {result.tls.version}
              </span>
              {result.tls.expired ? (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35">
                  EXPIRED
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35">
                  Valid ({result.tls.daysUntilExpiry} days left)
                </span>
              )}
              {result.tls.selfSigned && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35">
                  SELF-SIGNED
                </span>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2 font-mono text-[11px]">
              <div>
                <span className="block text-[10px] text-slate-400">
                  Subject Common Name (CN)
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 break-all">
                  {result.tls.subjectCn}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Issuer</span>
                <span className="text-slate-800 dark:text-slate-200 break-all">
                  {result.tls.issuer}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">
                  Cipher Suite
                </span>
                <span className="text-slate-700 dark:text-slate-300 break-all">
                  {result.tls.cipherSuite}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Valid From
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {result.tls.notBefore}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Valid Until
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {result.tls.notAfter}
                  </span>
                </div>
              </div>
              {result.tls.serialNumber && (
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Serial Number (Hex)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 break-all">
                    {result.tls.serialNumber}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Subject Alternative Names ({result.tls.sans?.length || 0})
                </span>
                {result.tls.sans && result.tls.sans.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      triggerCopy('sans', result.tls!.sans.join('\n'))
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-slate-200/70 dark:bg-cyber-surface text-slate-700 dark:text-slate-200"
                  >
                    {copiedKey === 'sans' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy SANs</span>
                  </button>
                )}
              </div>

              {result.tls.sans && result.tls.sans.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                  {result.tls.sans.map((san) => (
                    <span
                      key={san}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-slate-800 dark:text-slate-200"
                    >
                      {san}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No SAN entries present on certificate.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: REDIRECT CHAIN */}
        {activeTab === 'redirects' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              HTTP Redirect Chain ({redirectCount} hop{redirectCount === 1 ? '' : 's'})
            </div>

            {redirectCount === 0 ? (
              <div className="p-4 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 text-slate-500 dark:text-slate-400 text-xs">
                Direct response — no HTTP redirects occurred.
              </div>
            ) : (
              <div className="space-y-2.5">
                {result.redirectChain.map((hop, idx) => (
                  <div
                    key={`${hop.url}-${idx}`}
                    className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-surface/40 space-y-1.5 font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Hop #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35">
                        HTTP {hop.statusCode}
                      </span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 break-all">
                      {hop.url}
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 break-all">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{hop.location}</span>
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 font-mono text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Final Destination ({result.statusCode})</span>
                  </div>
                  <div className="text-slate-900 dark:text-slate-100 break-all">
                    {result.finalUrl || result.url}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};