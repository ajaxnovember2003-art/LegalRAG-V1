import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Check, FileText } from 'lucide-react';

const SUGGESTIONS = [
  {
    label: 'Section 103 BNS (Murder)',
    q: 'What is the punishment for murder under Section 103 of BNS 2023?'
  },
  {
    label: 'Section 173 BNSS (Zero FIR)',
    q: 'What is the procedure for zero FIR under BNSS 2023?'
  },
  {
    label: 'Section 63 BSA (Electronic evidence)',
    q: 'How is electronic evidence made admissible under Section 63 of BSA 2023?'
  }
];

export default function EmptyState({ children, onSelectExample }) {
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="w-full flex flex-col items-center justify-center text-center animate-fade-in pt-4 pb-6 sm:pt-6 sm:pb-8 max-w-4xl mx-auto">
      
      {/* Clean Headline & Subtitle */}
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 leading-tight">
        Indian Statutory Research
      </h1>
      
      <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-6 font-normal">
        Search criminal statutes with verified section citations.
      </p>

      {/* Primary Search Input (Clear first action) */}
      <div className="w-full max-w-3xl mx-auto mb-4 text-left">
        {children}
      </div>

      {/* Exactly 3 Suggestions */}
      <div className="w-full max-w-3xl mx-auto mb-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectExample && onSelectExample(s.q)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-secondary)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/60 text-xs font-medium text-slate-200 hover:text-white hover:bg-[var(--navy-800)] transition-all cursor-pointer shadow-xs"
            >
              <span>{s.label}</span>
              <ArrowRight className="h-3 w-3 text-[var(--gold-400)] opacity-70" />
            </button>
          ))}
        </div>
      </div>

      {/* Optional Sample Answer Toggle */}
      <div className="w-full max-w-2xl mx-auto text-left">
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={() => setShowExample(!showExample)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--navy-900)] hover:bg-[var(--navy-800)] border border-[var(--surface-border)] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[var(--gold-400)]" />
            <span>{showExample ? 'Hide example answer' : 'View example answer'}</span>
            {showExample ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Collapsible Sample Answer */}
        {showExample && (
          <div className="p-5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-xs sm:text-sm text-slate-200 space-y-3 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2 text-xs font-mono text-[var(--gold-400)]">
              <span>Query: Punishment for murder under Section 103 BNS</span>
              <button
                type="button"
                onClick={() => onSelectExample && onSelectExample("What is the punishment for murder under Section 103 of BNS 2023?")}
                className="text-[var(--gold-400)] hover:underline flex items-center gap-1 cursor-pointer font-sans text-xs font-semibold"
              >
                <span>Run live</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <p className="leading-relaxed">
              <strong className="text-white">Section 103(1) BNS 2023:</strong> Prescribes punishment with <span className="text-emerald-300 font-semibold">death or imprisonment for life</span>, and liability to fine.
            </p>

            <p className="leading-relaxed">
              <strong className="text-white">Section 103(2) BNS 2023:</strong> When murder is committed by five or more persons acting in concert on grounds of race, caste, sex, or community, each person is punished with death or life imprisonment.
            </p>

            <div className="pt-2 border-t border-[var(--surface-border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>Citations: Section 103(1) & (2) BNS 2023 (Gazette p. 34)</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Verified citation
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
