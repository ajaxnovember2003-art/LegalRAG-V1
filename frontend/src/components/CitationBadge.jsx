import { BookOpen } from 'lucide-react';
import { formatSourceShort, formatPageRange } from '../utils/formatters';

export default function CitationBadge({ source, onClick, active = false }) {
  if (!source) return null;

  const shortName = formatSourceShort(source.source || source);
  const pageRange = typeof source === 'object' ? formatPageRange(source) : null;

  const handleClick = () => {
    if (onClick) onClick(source);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`View citation for ${shortName}`}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
        active
          ? 'bg-[var(--gold-500)]/25 text-[var(--gold-400)] border border-[var(--gold-500)]/50 shadow-sm'
          : 'bg-[var(--navy-800)] text-[var(--text-primary)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/50 hover:bg-[var(--navy-700)]'
      }`}
    >
      <BookOpen className="h-3.5 w-3.5 text-[var(--gold-400)]" />
      <span>{shortName}</span>
      {pageRange && <span className="text-[var(--gold-300)] font-mono text-xs font-normal">• {pageRange}</span>}
    </button>
  );
}
