/**
 * useLegalRAG — Custom hook for the query flow.
 *
 * Encapsulates loading state, error handling, recent
 * searches (localStorage), and the actual API call.
 */
import { useState, useCallback, useEffect } from 'react';
import { askLegalRAG, healthCheck } from '../services/api';

const STORAGE_KEY = 'legalrag_recent_searches';
const MAX_RECENT = 20;

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useLegalRAG() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState(loadRecent);

  // ── Health ──────────────────────────────────────────
  const [apiStatus, setApiStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  const checkHealth = useCallback(async () => {
    try {
      const data = await healthCheck();
      setApiStatus(data.pipeline_loaded ? 'online' : 'degraded');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // ── Submit Query ────────────────────────────────────
  const submitQuery = useCallback(async (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await askLegalRAG(trimmed);
      setResult(data);

      // Persist to recent searches
      const entry = {
        question: trimmed,
        timestamp: new Date().toISOString(),
      };

      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.question !== trimmed);
        const next = [entry, ...filtered].slice(0, MAX_RECENT);
        saveRecent(next);
        return next;
      });
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 503) {
        setError({ type: 'unavailable', message: detail || 'LegalRAG pipeline is not available.' });
      } else if (status === 400) {
        setError({ type: 'validation', message: detail || 'Invalid query.' });
      } else if (err.code === 'ECONNABORTED') {
        setError({ type: 'timeout', message: 'The request timed out. The pipeline may be under heavy load.' });
      } else if (!err.response) {
        setError({ type: 'network', message: 'Cannot connect to the LegalRAG backend. Is the server running?' });
      } else {
        setError({ type: 'server', message: detail || `Server error (${status}).` });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Clear History ───────────────────────────────────
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    saveRecent([]);
  }, []);

  const deleteHistoryItem = useCallback((question) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.question !== question);
      saveRecent(filtered);
      return filtered;
    });
  }, []);

  // ── Reset ───────────────────────────────────────────
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    result,
    error,
    apiStatus,
    recentSearches,
    submitQuery,
    ask: submitQuery,
    clearHistory,
    deleteHistoryItem,
    reset,
    clear: reset,
  };
}
