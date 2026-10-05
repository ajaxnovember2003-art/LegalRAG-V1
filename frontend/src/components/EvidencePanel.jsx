import { ShieldCheck, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import CitationBadge from './CitationBadge';
import { formatSourceName } from '../utils/formatters';

export default function EvidencePanel({ sources = [], onSelectSource }) {
  if (!sources || sources.length === 0) return null;

  // Group by source file
  const grouped = sources.reduce((acc, item) => {
    const src = item.source || 'Unknown';
    if (!acc[src]) acc[src] = [];
    acc[src].push(item);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-secondary)] p-5 sm:p-6 mt-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--success)]/15 text-[var(--success)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Retrieved Grounding Breakdown
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Citations and distribution across Indian Criminal Acts
            </p>
          </div>
        </div>
        <span className="text-xs text-[var(--gold-400)] font-mono font-medium bg-[var(--gold-500)]/10 px-2.5 py-1 rounded-md border border-[var(--gold-500)]/20">
          Strictly Grounded
        </span>
      </div>

      {/* Citations Badges Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        {sources.map((srcItem, idx) => (
          <CitationBadge
            key={`${srcItem.source}-${srcItem.chunk_id ?? idx}`}
            source={srcItem}
            onClick={() => onSelectSource && onSelectSource(srcItem)}
          />
        ))}
      </div>

      {/* Statute distribution breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--surface-border)]">
        {Object.entries(grouped).map(([filename, items]) => (
          <div
            key={filename}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)] text-sm"
          >
            <div className="flex items-center gap-2.5 truncate">
              <BookOpen className="h-4 w-4 text-[var(--gold-400)] shrink-0" />
              <span className="text-[var(--text-primary)] truncate font-semibold">
                {formatSourceName(filename)}
              </span>
            </div>
            <span className="font-mono text-xs text-[var(--gold-300)] ml-2 shrink-0 bg-[var(--navy-850)] px-2 py-0.5 rounded border border-[var(--surface-border)] font-semibold">
              {items.length} {items.length === 1 ? 'passage' : 'passages'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
