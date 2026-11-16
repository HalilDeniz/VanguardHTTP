export type ScanState = 'idle' | 'running' | 'paused' | 'completed' | 'stopped';

export type StatusCategoryFilter = 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'err';

export type ExportFormat = 'json' | 'csv' | 'txt' | 'html';

export type SortField =
  | 'id'
  | 'url'
  | 'statusCode'
  | 'title'
  | 'contentLength'
  | 'responseTimeMs';

export type SortDirection = 'asc' | 'desc';

export interface ScanConfig {
  targets: string[];
  ports: number[];
  customPath: string;
  method: string;
  requestBody: string;
  customHeaders: Record<string, string>;
  userAgent: string;
  randomUserAgent: boolean;
  proxyUrl: string;
  threads: number;
  rateLimit: number;
  timeoutSec: number;
  retries: number;
  maxBodySizeKb: number;
  followRedirects: boolean;
  maxRedirects: number;
  probeBothSchemes: boolean;
  httpsFallback: boolean;
  verifySsl: boolean;
  enableTechDetect: boolean;
  enableDns: boolean;
  enableTls: boolean;
  enableFavicon: boolean;
}

export interface TechMatch {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

export interface DNSInfo {
  a: string[];
  aaaa: string[];
  cname: string[];
  cdn?: string;
}

export interface TLSInfo {
  version: string;
  cipherSuite: string;
  subjectCn: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  daysUntilExpiry: number;
  expired: boolean;
  selfSigned: boolean;
  sans: string[];
  serialNumber: string;
}

export interface FaviconInfo {
  url: string;
  mmh3: number;
  md5: string;
  shodanQuery: string;
}

export interface RedirectHop {
  url: string;
  statusCode: number;
  location: string;
}

export interface ProbeResult {
  id: number;
  timestamp: string;
  input: string;
  url: string;
  finalUrl: string;
  scheme: string;
  host: string;
  port: number;
  path: string;
  statusCode: number;
  statusText: string;
  title: string;
  webServer: string;
  poweredBy: string;
  contentType: string;
  contentLength: number;
  words: number;
  lines: number;
  responseTimeMs: number;
  bodySha256: string;
  technologies: TechMatch[];
  dns: DNSInfo;
  tls?: TLSInfo;
  favicon?: FaviconInfo;
  redirectChain: RedirectHop[];
  rawRequest: string;
  rawResponseHeaders: string;
  responseHeaders: Record<string, string>;
  bodyPreview: string;
  failed: boolean;
  error?: string;
}

export interface ScanStats {
  state: ScanState;
  totalTargets: number;
  scannedTargets: number;
  respondedCount: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  failedCount: number;
  currentRps: number;
  averageRps: number;
  progressPercent: number;
  elapsedMs: number;
  activeWorkers: number;
  startTime?: string;
}

export interface FilterOptions {
  searchQuery: string;
  useRegex: boolean;
  statusCategory: StatusCategoryFilter;
  selectedTech: string;
  hideSimilarSizes: boolean;
  hideFailed: boolean;
}

export interface VanguardBackendAPI {
  GetDefaultConfig(): Promise<ScanConfig>;
  PreviewTargetCount(rawTargets: string[], cfg: ScanConfig): Promise<number>;
  StartScan(cfg: ScanConfig): Promise<void>;
  PauseScan(): Promise<void>;
  ResumeScan(): Promise<void>;
  StopScan(): Promise<void>;
  GetScanStats(): Promise<ScanStats>;
  GetAllResults(): Promise<ProbeResult[]>;
  ClearResults(): Promise<void>;
  ImportTargetsFromDialog(): Promise<string>;
  ReadTargetFile(filePath: string): Promise<string>;
  ExportResults(
    format: ExportFormat,
    filteredSubset: ProbeResult[],
    exportAll: boolean
  ): Promise<string>;
  CopyToClipboard(text: string): Promise<void>;
  OpenExternalURL(rawURL: string): Promise<void>;
}

export interface WailsRuntimeAPI {
  EventsOn(eventName: string, callback: (...data: any[]) => void): () => void;
  EventsOff(eventName: string, ...additionalEventNames: string[]): void;
}

declare global {
  interface Window {
    go?: {
      app?: {
        App?: VanguardBackendAPI;
      };
    };
    runtime?: WailsRuntimeAPI;
  }
}

export const INITIAL_STATS: ScanStats = {
  state: 'idle',
  totalTargets: 0,
  scannedTargets: 0,
  respondedCount: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  failedCount: 0,
  currentRps: 0,
  averageRps: 0,
  progressPercent: 0,
  elapsedMs: 0,
  activeWorkers: 0,
};

export const FALLBACK_CONFIG: ScanConfig = {
  targets: [],
  ports: [],
  customPath: '',
  method: 'GET',
  requestBody: '',
  customHeaders: {},
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  randomUserAgent: true,
  proxyUrl: '',
  threads: 50,
  rateLimit: 150,
  timeoutSec: 10,
  retries: 1,
  maxBodySizeKb: 2048,
  followRedirects: true,
  maxRedirects: 10,
  probeBothSchemes: false,
  httpsFallback: true,
  verifySsl: false,
  enableTechDetect: true,
  enableDns: true,
  enableTls: true,
  enableFavicon: true,
};