import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_STATS,
  ProbeResult,
  ScanConfig,
  ScanStats,
} from '../types/vanguard';

const FLUSH_INTERVAL_MS = 100;

export function useScanStream() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [stats, setStats] = useState<ScanStats>(INITIAL_STATS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buffer incoming results so high-RPS scans flush smoothly in 100ms micro-batches
  const pendingBufferRef = useRef<ProbeResult[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());

  const flushBuffer = useCallback(() => {
    if (pendingBufferRef.current.length === 0) {
      return;
    }
    const batch = pendingBufferRef.current;
    pendingBufferRef.current = [];

    setResults((prev) => {
      const next = prev.slice();
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        if (!seenIdsRef.current.has(item.id)) {
          seenIdsRef.current.add(item.id);
          next.push(item);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(flushBuffer, FLUSH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [flushBuffer]);

  useEffect(() => {
    const rt = window.runtime;
    if (!rt) {
      return;
    }

    const unsubResult = rt.EventsOn('scan:result', (incoming: ProbeResult) => {
      if (incoming && typeof incoming.id === 'number') {
        pendingBufferRef.current.push(incoming);
      }
    });

    const unsubStats = rt.EventsOn('scan:stats', (incomingStats: ScanStats) => {
      if (incomingStats) {
        setStats(incomingStats);
        if (
          incomingStats.state === 'completed' ||
          incomingStats.state === 'stopped'
        ) {
          flushBuffer();
        }
      }
    });

    return () => {
      if (typeof unsubResult === 'function') {
        unsubResult();
      }
      if (typeof unsubStats === 'function') {
        unsubStats();
      }
    };
  }, [flushBuffer]);

  const startScan = useCallback(async (cfg: ScanConfig): Promise<boolean> => {
    const api = window.go?.app?.App;
    if (!api) {
      setErrorMessage('Wails backend bridge is unavailable.');
      return false;
    }

    setErrorMessage(null);
    pendingBufferRef.current = [];
    seenIdsRef.current.clear();
    setResults([]);
    setStats({
      ...INITIAL_STATS,
      state: 'running',
    });

    try {
      await api.StartScan(cfg);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStats((prev) => ({ ...prev, state: 'idle' }));
      return false;
    }
  }, []);

  const pauseScan = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) return;
    try {
      setErrorMessage(null);
      await api.PauseScan();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const resumeScan = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) return;
    try {
      setErrorMessage(null);
      await api.ResumeScan();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const stopScan = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) return;
    try {
      setErrorMessage(null);
      await api.StopScan();
      flushBuffer();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [flushBuffer]);

  const clearResults = useCallback(async () => {
    const api = window.go?.app?.App;
    if (!api) return;
    try {
      setErrorMessage(null);
      await api.ClearResults();
      pendingBufferRef.current = [];
      seenIdsRef.current.clear();
      setResults([]);
      setStats(INITIAL_STATS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    results,
    stats,
    errorMessage,
    clearError,
    startScan,
    pauseScan,
    resumeScan,
    stopScan,
    clearResults,
  };
}