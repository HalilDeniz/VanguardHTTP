export namespace models {
	
	export class DNSInfo {
	    a: string[];
	    aaaa: string[];
	    cname: string[];
	    cdn?: string;
	
	    static createFrom(source: any = {}) {
	        return new DNSInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.a = source["a"];
	        this.aaaa = source["aaaa"];
	        this.cname = source["cname"];
	        this.cdn = source["cdn"];
	    }
	}
	export class FaviconInfo {
	    url: string;
	    mmh3: number;
	    md5: string;
	    shodanQuery: string;
	
	    static createFrom(source: any = {}) {
	        return new FaviconInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.mmh3 = source["mmh3"];
	        this.md5 = source["md5"];
	        this.shodanQuery = source["shodanQuery"];
	    }
	}
	export class RedirectHop {
	    url: string;
	    statusCode: number;
	    location: string;
	
	    static createFrom(source: any = {}) {
	        return new RedirectHop(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.statusCode = source["statusCode"];
	        this.location = source["location"];
	    }
	}
	export class TLSInfo {
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
	
	    static createFrom(source: any = {}) {
	        return new TLSInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.cipherSuite = source["cipherSuite"];
	        this.subjectCn = source["subjectCn"];
	        this.issuer = source["issuer"];
	        this.notBefore = source["notBefore"];
	        this.notAfter = source["notAfter"];
	        this.daysUntilExpiry = source["daysUntilExpiry"];
	        this.expired = source["expired"];
	        this.selfSigned = source["selfSigned"];
	        this.sans = source["sans"];
	        this.serialNumber = source["serialNumber"];
	    }
	}
	export class TechMatch {
	    name: string;
	    category: string;
	    version?: string;
	    confidence: number;
	
	    static createFrom(source: any = {}) {
	        return new TechMatch(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.category = source["category"];
	        this.version = source["version"];
	        this.confidence = source["confidence"];
	    }
	}
	export class ProbeResult {
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
	
	    static createFrom(source: any = {}) {
	        return new ProbeResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.input = source["input"];
	        this.url = source["url"];
	        this.finalUrl = source["finalUrl"];
	        this.scheme = source["scheme"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.path = source["path"];
	        this.statusCode = source["statusCode"];
	        this.statusText = source["statusText"];
	        this.title = source["title"];
	        this.webServer = source["webServer"];
	        this.poweredBy = source["poweredBy"];
	        this.contentType = source["contentType"];
	        this.contentLength = source["contentLength"];
	        this.words = source["words"];
	        this.lines = source["lines"];
	        this.responseTimeMs = source["responseTimeMs"];
	        this.bodySha256 = source["bodySha256"];
	        this.technologies = this.convertValues(source["technologies"], TechMatch);
	        this.dns = this.convertValues(source["dns"], DNSInfo);
	        this.tls = this.convertValues(source["tls"], TLSInfo);
	        this.favicon = this.convertValues(source["favicon"], FaviconInfo);
	        this.redirectChain = this.convertValues(source["redirectChain"], RedirectHop);
	        this.rawRequest = source["rawRequest"];
	        this.rawResponseHeaders = source["rawResponseHeaders"];
	        this.responseHeaders = source["responseHeaders"];
	        this.bodyPreview = source["bodyPreview"];
	        this.failed = source["failed"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ScanConfig {
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
	
	    static createFrom(source: any = {}) {
	        return new ScanConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targets = source["targets"];
	        this.ports = source["ports"];
	        this.customPath = source["customPath"];
	        this.method = source["method"];
	        this.requestBody = source["requestBody"];
	        this.customHeaders = source["customHeaders"];
	        this.userAgent = source["userAgent"];
	        this.randomUserAgent = source["randomUserAgent"];
	        this.proxyUrl = source["proxyUrl"];
	        this.threads = source["threads"];
	        this.rateLimit = source["rateLimit"];
	        this.timeoutSec = source["timeoutSec"];
	        this.retries = source["retries"];
	        this.maxBodySizeKb = source["maxBodySizeKb"];
	        this.followRedirects = source["followRedirects"];
	        this.maxRedirects = source["maxRedirects"];
	        this.probeBothSchemes = source["probeBothSchemes"];
	        this.httpsFallback = source["httpsFallback"];
	        this.verifySsl = source["verifySsl"];
	        this.enableTechDetect = source["enableTechDetect"];
	        this.enableDns = source["enableDns"];
	        this.enableTls = source["enableTls"];
	        this.enableFavicon = source["enableFavicon"];
	    }
	}
	export class ScanStats {
	    state: string;
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
	
	    static createFrom(source: any = {}) {
	        return new ScanStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.totalTargets = source["totalTargets"];
	        this.scannedTargets = source["scannedTargets"];
	        this.respondedCount = source["respondedCount"];
	        this.status2xx = source["status2xx"];
	        this.status3xx = source["status3xx"];
	        this.status4xx = source["status4xx"];
	        this.status5xx = source["status5xx"];
	        this.failedCount = source["failedCount"];
	        this.currentRps = source["currentRps"];
	        this.averageRps = source["averageRps"];
	        this.progressPercent = source["progressPercent"];
	        this.elapsedMs = source["elapsedMs"];
	        this.activeWorkers = source["activeWorkers"];
	        this.startTime = source["startTime"];
	    }
	}
	

}

