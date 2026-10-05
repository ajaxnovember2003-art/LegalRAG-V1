import { useState, useMemo } from 'react';
import { BookOpen, Filter, Search, Layers, SlidersHorizontal, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import SourceCard from './SourceCard';
import { formatSourceShort } from '../utils/formatters';

export default function SourcesPanel({ sources = [], onViewDocument }) {
  const [filterSource, setFilterSource] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isTechnicalMode, setIsTechnicalMode] = useState(false);

  // Extract unique sources for filter tabs
  const availableSources = useMemo(() => {
    const set = new Set();
    sources.forEach((s) => {
      if (s.source) set.add(s.source);
    });
    return Array.from(set);
  }, [sources]);

  // Count operative vs TOC
  const operativeCount = useMemo(() => {
    return sources.filter((s) => !s.is_toc).length;
  }, [sources]);

  // Filter sources
  const filteredSources = useMemo(() => {
    return sources.filter((item) => {
      if (filterSource !== 'ALL' && item.source !== filterSource) {
        return false;
      }
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const text = (item.text || '').toLowerCase();
        const sourceName = (item.source || '').toLowerCase();
        const sec = (item.detected_sections || []).join(' ').toLowerCase();
        return text.includes(query) || sourceName.includes(query) || sec.includes(query);
      }
      return true;
    });
  }, [sources, filterSource, searchFilter]);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <section className="mt-10" aria-label="Retrieved Evidence Sources">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 text-[var(--gold-400)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-[var(--text-primary)]">
              Retrieved Statutory Evidence Passages
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              {sources.length} passage{sources.length !== 1 ? 's' : ''} retrieved ({operativeCount} operative statutory provisions)
            </p>
          </div>
        </div>

        {/* Global Technical Mode Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTechnicalMode(!isTechnicalMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all border cursor-pointer ${
              isTechnicalMode
                ? 'bg-[var(--gold-500)]/20 text-[var(--gold-300)] border-[var(--gold-400)]/50 shadow-xs'
                : 'bg-[var(--navy-900)] text-slate-400 hover:text-slate-200 border-[var(--surface-border)]'
            }`}
            title="Toggle internal machine ranking metrics (RRF, Cross-Encoder, BM25, Dense rank)"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Technical Inspection: {isTechnicalMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Distinction Explanation Banner */}
      <div className="mb-4 px-4 py-2.5 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)] text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-[var(--gold-400)] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-200">Legal Distinction:</strong> Retrieval ranking reflects hybrid lexical (BM25) and dense semantic cross-encoder ranking. Statutory validity is independently verified against official Gazette chapters and concordance mappings.
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Source filter tabs */}
        {availableSources.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--navy-900)] border border-[var(--surface-border)] overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterSource('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterSource === 'ALL'
                  ? 'bg-[var(--gold-500)]/20 text-[var(--gold-400)] border border-[var(--gold-500)]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({sources.length})
            </button>
            {availableSources.map((src) => {
              const count = sources.filter((s) => s.source === src).length;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setFilterSource(src)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    filterSource === src
                      ? 'bg-[var(--gold-500)]/20 text-[var(--gold-400)] border border-[var(--gold-500)]/30'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {formatSourceShort(src)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Search inside passages */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter within retrieved passages..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[var(--surface-primary)] border border-[var(--surface-border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-400)]"
          />
        </div>
      </div>

      {/* Source Cards List */}
      <div className="space-y-4">
        {filteredSources.map((source, index) => (
          <SourceCard
            key={`${source.source}-${source.chunk_id ?? index}`}
            source={source}
            rank={index + 1}
            onViewDocument={onViewDocument}
            isTechnicalMode={isTechnicalMode}
          />
        ))}

        {filteredSources.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-sm text-[var(--text-muted)]">
            No evidence passages match your current filter.
          </div>
        )}
      </div>
    </section>
  );
}
