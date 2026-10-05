import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Sparkles,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { formatSourceName, formatPageRange, formatScore } from '../utils/formatters';

export default function SourceCard({ 
  source, 
  rank, 
  onViewDocument,
  isTechnicalMode = false 
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLocalTechnical, setShowLocalTechnical] = useState(false);

  if (!source) return null;

  const actName = source.statute_name || formatSourceName(source.source);
  const actShort = source.statute_short || source.statute_code?.toUpperCase() || 'Statute';
  const pageRange = source.page_display || formatPageRange(source);
  const rerankScore = formatScore(source.rerank_score);
  const rrfScore = source.rrf_score ? Number(source.rrf_score).toFixed(4) : null;
  const passage = source.text || '';
  
  const detectedSections = source.detected_sections || [];
  const primarySection = detectedSections.length > 0 ? detectedSections[0] : null;
  const sectionTitle = source.section_title || (primarySection === '2' ? 'Definitions' : null);
  const isToc = Boolean(source.is_toc);
  const retrievalMethod = source.retrieval_method || 'hybrid_rrf';
  const relevanceExplanation = source.relevance_explanation;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(passage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shouldShowTechnical = isTechnicalMode || showLocalTechnical;

  // Directory URL for direct navigation
  const directoryUrl = primarySection 
    ? `/statutes/${source.statute_code || 'all'}/${primarySection ? `section-${primarySection}` : ''}`
    : `/statutes/${source.statute_code || 'all'}`;

  return (
    <article 
      className={`legal-card group transition-all duration-200 relative overflow-hidden ${
        isToc 
          ? 'border-amber-500/30 bg-amber-950/10' 
          : 'hover:border-[var(--gold-400)]/40'
      }`}
      aria-label={`Source passage ${rank}: ${actName}`}
    >
      {/* ─── Top Header: Act, Section & Actions ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--gold-500)]/20 text-[var(--gold-400)] font-mono text-sm font-bold border border-[var(--gold-500)]/30 shrink-0 mt-0.5">
            #{rank}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {actName}
              </h3>
              
              {primarySection && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--gold-500)]/15 text-[var(--gold-300)] border border-[var(--gold-500)]/30">
                  <BookOpen className="h-3 w-3" />
                  Section {primarySection}
                </span>
              )}

              {sectionTitle && (
                <span className="text-xs font-medium text-slate-300 italic">
                  "{sectionTitle}"
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
              <span className="font-mono text-xs text-[var(--navy-200)] font-medium">
                {source.source}
              </span>
              {pageRange && (
                <>
                  <span>•</span>
                  <span className="font-medium text-[var(--text-secondary)]">{pageRange}</span>
                </>
              )}
              {source.chunk_id != null && (
                <>
                  <span>•</span>
                  <span>Chunk #{source.chunk_id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action icons & Directory Navigation */}
        <div className="flex items-center gap-2 self-end sm:self-start flex-wrap">
          {primarySection && (
            <Link
              to={directoryUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-colors"
              title="Open section in Statutes Directory"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Directory</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy passage to clipboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--navy-800)]/80 hover:bg-[var(--navy-750)] border border-[var(--surface-border)] transition-colors cursor-pointer"
            aria-label="Copy passage"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onViewDocument && (
            <button
              type="button"
              onClick={() => onViewDocument(source)}
              title="Inspect full source passage in modal"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--gold-400)] hover:text-[var(--gold-300)] bg-[var(--gold-500)]/10 hover:bg-[var(--gold-500)]/20 border border-[var(--gold-500)]/30 transition-colors cursor-pointer"
              aria-label="Inspect full source"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Inspect</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Legal Relevance & Method Badges ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Retrieval Method Badge */}
        {retrievalMethod === 'exact_statutory_provision' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Exact Statutory Provision
          </span>
        )}
        {retrievalMethod === 'statutory_concordance' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Statutory Concordance
          </span>
        )}
        {retrievalMethod === 'hybrid_rrf' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            Hybrid Lexical + Semantic
          </span>
        )}

        {/* Grounding Status Badge */}
        {isToc ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            Index / Concordance Table
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="h-3.5 w-3.5" />
            Operative Provision
          </span>
        )}

        {/* Technical view toggle if not global */}
        {!isTechnicalMode && (
          <button
            type="button"
            onClick={() => setShowLocalTechnical(!showLocalTechnical)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>{showLocalTechnical ? 'Hide Pipeline Metrics' : 'Pipeline Metrics'}</span>
          </button>
        )}
      </div>

      {/* ─── Relevance Explanation Callout ───────────────────────────── */}
      {relevanceExplanation && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--navy-900)]/70 border border-[var(--surface-border)] text-xs text-slate-300 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-[var(--gold-400)] shrink-0" />
          <span>{relevanceExplanation}</span>
        </div>
      )}

      {/* ─── TOC Contamination Notice (if applicable) ─────────────────── */}
      {isToc && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Preliminary Index Passage:</strong> This chunk contains the Gazette arrangement of sections or historical correspondence index, not the substantive operative statutory text.
          </div>
        </div>
      )}

      {/* ─── Technical Pipeline Metrics (Developer/Researcher Mode) ──── */}
      {shouldShowTechnical && (
        <div className="mb-3 p-3 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)] text-xs font-mono space-y-1.5 animate-fade-in">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold-400)] mb-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Internal Retrieval & Reranker Pipeline Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500 block">Rerank Score:</span>
              <span className="text-[var(--gold-400)] font-semibold">{rerankScore ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">RRF Fusion Score:</span>
              <span className="text-sky-300 font-semibold">{rrfScore ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Dense Rank:</span>
              <span className="text-purple-300">{source.semantic_rank ? `#${source.semantic_rank}` : 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">BM25 Rank:</span>
              <span className="text-emerald-300">{source.bm25_rank ? `#${source.bm25_rank}` : 'None'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Passage Text Excerpt ─────────────────────────────────────── */}
      <div className="relative">
        <p className={`text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-sans whitespace-pre-wrap ${!expanded ? 'line-clamp-4' : ''}`}>
          {passage}
        </p>

        {passage.length > 220 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--gold-400)] hover:text-[var(--gold-300)] transition-colors cursor-pointer"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Read full statutory passage ({passage.length} chars)</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
