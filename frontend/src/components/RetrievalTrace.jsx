import { useState } from 'react';
import { 
  GitCommit, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Layers, 
  Sparkles, 
  Maximize2, 
  Cpu, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

const STAGE_ICONS = {
  0: Database,
  1: Layers,
  2: Sparkles,
  3: Maximize2,
  4: Cpu,
};

const STAGE_DETAILS = [
  'Executes parallel dense vector search (sentence-transformers) and sparse BM25 lexical keyword search across BNS, BNSS, and BSA.',
  'Combines semantic and lexical candidate rankings using Reciprocal Rank Fusion (RRF constant k=60) into top 50 candidates.',
  'Applies cross-encoder model (cross-encoder/ms-marco-MiniLM-L-6-v2) for deep query-passage joint attention, selecting top 5.',
  'Expands ±1 contiguous chunk window around top reranked statutory sections to preserve statutory context.',
  'Sends grounded context and legal prompt to Google Gemini for synthesis, citing Indian penal & procedural sections.',
];

export default function RetrievalTrace({ stages = [], processingTime, sourcesCount }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!stages || stages.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-secondary)] overflow-hidden transition-all shadow-md">
      {/* Header bar toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--navy-800)]/50 transition-colors text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--navy-700)] text-[var(--gold-400)] border border-[var(--surface-border)]">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--gold-400)] font-bold">
              Multi-Stage Pipeline Execution Trace
            </span>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 font-medium">
              <span>{stages.length} Verified Deterministic Stages</span>
              {processingTime != null && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-[var(--gold-400)]">
                    <Clock className="h-3.5 w-3.5" />
                    {processingTime}s end-to-end
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)] font-medium">
          <span>{isOpen ? 'Collapse Trace' : 'View Architecture Trace'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Timeline */}
      {isOpen && (
        <div className="px-6 py-5 border-t border-[var(--surface-border)] bg-[var(--navy-950)]/70">
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-5">
            Step-by-step query execution across the retrieval and generation pipeline:
          </p>

          <ol className="relative border-l border-[var(--navy-600)] ml-4 space-y-6">
            {stages.map((stageName, idx) => {
              const IconComponent = STAGE_ICONS[idx] || CheckCircle2;
              const detailText = STAGE_DETAILS[idx] || 'Pipeline processing stage.';

              return (
                <li key={stageName} className="ml-7">
                  {/* Step icon dot */}
                  <span className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--navy-800)] border border-[var(--navy-500)] text-[var(--gold-400)] shadow-sm">
                    <IconComponent className="h-3.5 w-3.5" />
                  </span>

                  {/* Stage title */}
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      Stage {idx + 1}: {stageName}
                    </h4>
                    <span className="text-xs font-mono text-[var(--success)] bg-[var(--success)]/15 border border-[var(--success)]/30 px-2 py-0.5 rounded-md font-semibold">
                      Executed
                    </span>
                  </div>

                  {/* Stage explanation */}
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {detailText}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 pt-4 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span className="font-mono text-[var(--navy-200)]">Hybrid Retrieval + RRF + Cross-Encoder Rerank + Window Expansion</span>
            <span className="font-semibold text-[var(--gold-400)]">Target: BNS, BNSS, BSA (2023)</span>
          </div>
        </div>
      )}
    </div>
  );
}
