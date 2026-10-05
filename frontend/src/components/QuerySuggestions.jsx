import { Lightbulb, ArrowUpRight } from 'lucide-react';

const SUGGESTIONS = [
  { q: 'What is the punishment for cheating under BNS?', act: 'BNS' },
  { q: 'What is the procedure for zero FIR under BNSS?', act: 'BNSS' },
  { q: 'How is electronic evidence admissible under Section 61 of BSA?', act: 'BSA' },
  { q: 'What is the punishment for murder under Section 103 of BNS?', act: 'BNS' },
  { q: 'What are the bail provisions and conditions under BNSS?', act: 'BNSS' },
  { q: 'What constitutes organized crime and terrorism under BNS?', act: 'BNS' },
];

export default function QuerySuggestions({ onSelect }) {
  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--gold-500)]/15 text-[var(--gold-400)]">
          <Lightbulb className="h-3.5 w-3.5" />
        </div>
        <h3 className="section-label">
          Suggested Legal Queries for Demonstration
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {SUGGESTIONS.map(({ q, act }) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="flex items-start justify-between gap-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-secondary)]/90 px-4 py-3 text-left transition-all hover:border-[var(--gold-400)]/60 hover:bg-[var(--surface-elevated)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
          >
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--navy-800)] text-[var(--gold-400)] border border-[var(--surface-border)] mb-1.5">
                {act}
              </span>
              <p className="text-sm sm:text-base font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-snug">
                {q}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--gold-400)] shrink-0 transition-colors mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
