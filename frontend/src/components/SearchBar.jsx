import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function SearchBar({ onSubmit, loading, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      inputRef.current?.focus();
    }
  }, [initialQuery]);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleClear() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="Legal question search">
      <div className="relative group">
        <div className="relative flex flex-col sm:flex-row sm:items-center rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] shadow-xl transition-all duration-200 focus-within:border-[var(--gold-400)]/70 focus-within:ring-2 focus-within:ring-[var(--gold-500)]/15 p-1.5 sm:p-2 gap-2 sm:gap-0">
          
          {/* Input text row */}
          <div className="flex items-center flex-1 min-w-0 w-full">
            {/* Search Icon */}
            <div className="pl-3 sm:pl-3.5 pr-2.5 text-[var(--gold-400)] shrink-0">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>

            {/* Input field */}
            <input
              ref={inputRef}
              id="legal-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about BNS, BNSS, or BSA provisions (e.g. Section 103 BNS, Zero FIR, Theft)..."
              disabled={loading}
              className="flex-1 min-w-0 bg-transparent py-2.5 sm:py-3 px-1 text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none disabled:opacity-50 font-normal leading-normal"
              aria-label="Legal question input"
              autoComplete="off"
            />

            {/* Keyboard shortcut hint when empty */}
            {!query && !loading && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[var(--text-muted)] bg-[var(--navy-900)] border border-[var(--surface-border)] mr-2 shrink-0">
                <span>Enter</span>
                <CornerDownLeft className="h-3 w-3" />
              </span>
            )}

            {/* Clear Button */}
            {query && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 mr-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                aria-label="Clear query text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end sm:justify-center shrink-0 pr-0.5 w-full sm:w-auto">
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-400)] px-4 sm:px-5 py-2.5 sm:py-2.5 text-xs sm:text-sm font-bold text-[var(--navy-950)] shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              aria-label="Submit legal question"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--navy-950)] border-t-transparent" />
                  <span>Synthesizing…</span>
                </>
              ) : (
                <>
                  <span>Research Law</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
