import { useState, useEffect } from 'react';
import { Loader2, Database, Layers, Sparkles, Cpu, Clock } from 'lucide-react';

const PIPELINE_STEPS = [
  { label: 'Hybrid Retrieval', desc: 'Searching vector index & BM25 sparse index...', icon: Database },
  { label: 'RRF Fusion', desc: 'Merging lexical and semantic ranks (k=60)...', icon: Layers },
  { label: 'Cross-Encoder Reranking', desc: 'Computing joint query-passage attention...', icon: Sparkles },
  { label: 'Gemini Synthesis', desc: 'Formulating legal answer strictly from retrieved statutes...', icon: Cpu },
];

export default function LoadingState({ query }) {
  const [activeStep, setActiveStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Tick timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Progress through pipeline steps visually
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(stepInterval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" aria-live="polite" aria-busy="true">
      {/* Query Echo Card */}
      <div className="legal-card p-6 sm:p-7 border-[var(--navy-600)] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold-400)]" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--gold-400)]">
              Executing Grounded Legal Pipeline
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-sm text-[var(--gold-400)] font-semibold bg-[var(--gold-500)]/10 px-3 py-1 rounded-lg border border-[var(--gold-500)]/20">
            <Clock className="h-4 w-4" />
            {seconds}s elapsed
          </span>
        </div>

        {query && (
          <p className="text-base sm:text-xl font-semibold text-[var(--text-primary)] italic mb-6">
            "{query}"
          </p>
        )}

        {/* Step progress pills */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div
                key={step.label}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-[var(--gold-400)] bg-[var(--gold-500)]/15 text-[var(--gold-400)] shadow-md'
                    : isCompleted
                    ? 'border-[var(--success)]/50 bg-[var(--navy-900)] text-[var(--success)]'
                    : 'border-[var(--surface-border)] bg-[var(--navy-950)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold leading-tight">{step.label}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Skeleton Shimmer */}
        <div className="space-y-3.5 pt-5 border-t border-[var(--surface-border)]">
          <div className="h-5 w-3/4 shimmer" />
          <div className="h-5 w-full shimmer" />
          <div className="h-5 w-5/6 shimmer" />
          <div className="h-5 w-2/3 shimmer" />
        </div>
      </div>

      {/* Source Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-56 shimmer mb-3" />
        <div className="h-32 w-full shimmer" />
        <div className="h-32 w-full shimmer" />
      </div>
    </div>
  );
}
