import { useState, useEffect, useCallback, useRef } from 'react';

interface UseResourceOptions {
  pollingIntervalMs?: number;
  staleAfterMs?: number;
  autoFetch?: boolean;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  options: UseResourceOptions = {}
) {
  const { pollingIntervalMs, staleAfterMs = 30000, autoFetch = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const executeFetch = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
      const now = Date.now();
      setLastFetched(now);
      setIsStale(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      executeFetch();
    }
  }, [autoFetch, executeFetch]);

  // Polling interval
  useEffect(() => {
    if (!pollingIntervalMs) return;

    const interval = setInterval(() => {
      executeFetch();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [pollingIntervalMs, executeFetch]);

  // Stale detection
  useEffect(() => {
    if (!lastFetched || !staleAfterMs) return;

    const checkInterval = setInterval(() => {
      if (Date.now() - lastFetched > staleAfterMs) {
        setIsStale(true);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [lastFetched, staleAfterMs]);

  return {
    data,
    loading,
    error,
    isStale,
    lastFetched,
    refetch: executeFetch,
  };
}
