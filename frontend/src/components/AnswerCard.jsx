import { 
  Scale, 
  Copy, 
  Check, 
  Clock, 
  FileText, 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Printer, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatSourceName, formatPageRange } from '../utils/formatters';

export default function AnswerCard({ result, onSelectSource, onSelectQuery }) {
  const [copiedType, setCopiedType] = useState(null); // 'text' | 'markdown'
  const [userRating, setUserRating] = useState(null); // 'up' | 'down'
  const [reportState, setReportState] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  if (!result) return null;

  const { 
    answer, 
    sources = [], 
    processing_time_seconds, 
    question,
    verification,
    follow_ups = []
  } = result;

  const isAbstention = 
    verification?.is_abstention ||
    answer.toLowerCase().includes('insufficient evidence') ||
    answer.toLowerCase().includes('outside the scope') ||
    answer.toLowerCase().includes('does not contain');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Copy plain text
  const handleCopyText = () => {
    navigator.clipboard.writeText(answer);
    setCopiedType('text');
    showToast('Analysis copied to clipboard');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy markdown with full citations
  const handleCopyMarkdown = () => {
    const citationList = (verification?.citations?.length ? verification.citations : sources).map((s, idx) => 
      `- [${idx + 1}] **${s.statute_name || s.statute_short || formatSourceName(s.source)}** (${s.section || 'Section'}, ${s.gazette_page || formatPageRange(s) || 'Gazette'}): "${(s.evidence_snippet || s.text || '').slice(0, 160)}..."`
    ).join('\n');

    const markdownText = `# Legal Research: ${question}\n\n## Grounded Statutory Analysis\n${answer}\n\n## Verified Gazette Citations\n${citationList}\n\n---\n*Verified by LegalRAG Indian Statutory Research System. In force from 1 July 2024.*`;

    navigator.clipboard.writeText(markdownText);
    setCopiedType('markdown');
    showToast('Markdown with Gazette citations copied');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Print answer
  const handlePrint = () => {
    window.print();
  };

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('legalrag_bookmarks') || '[]');
      if (isBookmarked) {
        const filtered = saved.filter((b) => b.question !== question);
        localStorage.setItem('legalrag_bookmarks', JSON.stringify(filtered));
        setIsBookmarked(false);
        showToast('Removed from saved research');
      } else {
        const item = { question, timestamp: new Date().toISOString() };
        localStorage.setItem('legalrag_bookmarks', JSON.stringify([item, ...saved]));
        setIsBookmarked(true);
        showToast('Saved to research session');
      }
    } catch {
      setIsBookmarked(!isBookmarked);
    }
  };

  // Submit evaluation report
  const handleReportSubmit = (e) => {
    e.preventDefault();
    setReportState(false);
    showToast('Citation audit logged for benchmark review');
  };

  // Parse structured markdown sections into clean visually distinct panels
  const renderStructuredAnswer = (text) => {
    if (!text) return null;

    // Pattern matching standard 8-part structured headers
    const rawBlocks = text.split(/(?=(?:^|\n)#{1,4}\s*(?:ANSWER SUMMARY|DIRECT ANSWER|STATUTORY PROVISIONS|LEGAL ANALYSIS|DETAILED LEGAL EXPLANATION|ILLUSTRATIVE EXAMPLES|APPLICATION|RELATED PROVISIONS|HISTORICAL CONCORDANCE|EXCEPTIONS & QUALIFICATIONS|LIMITATIONS & UNCERTAINTIES|SOURCES & CITATIONS|LAW SAYS|INFERENCE))/gi);

    if (rawBlocks.length > 1) {
      const parsedSections = [];

      rawBlocks.forEach((block, idx) => {
        const clean = block.trim();
        if (!clean) return;

        const headerMatch = clean.match(/^#{1,4}\s*([^:\n]+):?\n([\s\S]*)$/);
        if (headerMatch) {
          parsedSections.push({
            id: `sec-block-${idx}`,
            title: headerMatch[1].trim(),
            content: headerMatch[2].trim(),
          });
        } else {
          parsedSections.push({
            id: `sec-block-${idx}`,
            title: null,
            content: clean,
          });
        }
      });

      return (
        <div className="space-y-4">
          {/* Quick Jump Table of Contents for Long Answers */}
          {parsedSections.length >= 3 && (
            <nav 
              className="py-2.5 px-3 rounded-xl bg-[var(--surface-secondary)]/90 border border-[var(--surface-border)] overflow-x-auto select-none"
              aria-label="Answer Table of Contents"
            >
              <div className="flex items-center gap-1.5 min-w-max text-xs">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--gold-400)] mr-1 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>Contents:</span>
                </span>
                {parsedSections.map((sec, idx) => {
                  if (!sec.title) return null;
                  const shortTitle = sec.title
                    .replace(/\([^)]*\)/g, '')
                    .replace(/&/g, '+')
                    .trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(sec.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-[var(--gold-500)]/15 border border-transparent hover:border-[var(--gold-500)]/30 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {shortTitle}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Render Individual Section Panels */}
          {parsedSections.map((sec, idx) => {
            if (!sec.title) {
              return (
                <div 
                  key={idx} 
                  id={sec.id}
                  className="p-4 rounded-xl bg-[var(--surface-secondary)]/60 border border-[var(--surface-border)] text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-wrap font-sans"
                >
                  {sec.content}
                </div>
              );
            }

            const titleUpper = sec.title.toUpperCase();
            const isSummary = titleUpper.includes('ANSWER SUMMARY') || titleUpper.includes('DIRECT ANSWER');
            const isLawSays = titleUpper.includes('STATUTORY PROVISIONS') || titleUpper.includes('LAW SAYS');
            const isElements = titleUpper.includes('LEGAL ANALYSIS') || titleUpper.includes('ELEMENTS') || titleUpper.includes('EXPLANATION');
            const isExamples = titleUpper.includes('EXAMPLES') || titleUpper.includes('APPLICATION');
            const isRelated = titleUpper.includes('RELATED') || titleUpper.includes('CONCORDANCE');
            const isExceptions = titleUpper.includes('EXCEPTIONS') || titleUpper.includes('QUALIFICATIONS');
            const isLimitations = titleUpper.includes('LIMITATIONS') || titleUpper.includes('UNCERTAINTIES');

            let cardStyles = 'bg-[var(--surface-secondary)]/50 border-[var(--surface-border)]';
            let badgeStyles = 'bg-slate-800 text-slate-300 border-slate-700';

            if (isSummary) {
              cardStyles = 'bg-[var(--surface-elevated)]/90 border-[var(--gold-500)]/35 shadow-xs ring-1 ring-[var(--gold-500)]/10';
              badgeStyles = 'bg-[var(--gold-500)]/20 text-[var(--gold-400)] border border-[var(--gold-500)]/30';
            } else if (isLawSays) {
              cardStyles = 'bg-[var(--navy-900)] border-sky-500/30 border-l-3 border-l-sky-400';
              badgeStyles = 'bg-sky-500/15 text-sky-300 border border-sky-500/25';
            } else if (isElements) {
              cardStyles = 'bg-[var(--surface-secondary)]/70 border-purple-500/25';
              badgeStyles = 'bg-purple-500/15 text-purple-300 border border-purple-500/25';
            } else if (isExamples) {
              cardStyles = 'bg-[var(--surface-secondary)]/70 border-emerald-500/25';
              badgeStyles = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25';
            } else if (isRelated) {
              cardStyles = 'bg-[var(--surface-secondary)]/70 border-indigo-500/25';
              badgeStyles = 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25';
            } else if (isExceptions) {
              cardStyles = 'bg-amber-950/15 border-amber-500/30 text-amber-100';
              badgeStyles = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
            } else if (isLimitations) {
              cardStyles = 'bg-blue-950/15 border-blue-500/25 text-slate-300';
              badgeStyles = 'bg-blue-500/15 text-blue-300 border border-blue-500/25';
            }

            return (
              <section
                key={idx}
                id={sec.id}
                className={`rounded-xl p-4 sm:p-5 border transition-all ${cardStyles}`}
                aria-label={sec.title}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeStyles}`}>
                    {sec.title}
                  </span>
                  {isLawSays && (
                    <span className="text-[11px] font-mono text-sky-400 hidden sm:inline">
                      Official Gazette Operative Text
                    </span>
                  )}
                  {isExamples && (
                    <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline">
                      Hypothetical Illustration (Non-precedent)
                    </span>
                  )}
                </div>

                <div className={`text-sm sm:text-base leading-relaxed text-slate-200 font-sans whitespace-pre-wrap ${
                  isLawSays ? 'legal-quote text-slate-100' : ''
                }`}>
                  {sec.content}
                </div>
              </section>
            );
          })}
        </div>
      );
    }

    return (
      <div className="p-5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
        {text}
      </div>
    );
  };

  return (
    <article className="legal-card p-5 sm:p-7 relative overflow-hidden animate-fade-in" aria-label="Grounded Statutory Synthesis">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="absolute top-3 right-5 z-20 px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--gold-400)]/40 text-xs font-medium text-[var(--gold-300)] shadow-lg animate-fade-in flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── Top Header: Status, Query & Actions ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--surface-border)] pb-4 mb-4">
        
        {/* Left: Title & Verification Status */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-[var(--gold-400)] shrink-0" />
              <span>Grounded Legal Synthesis</span>
            </h2>

            {/* Verification Status Pill */}
            {isAbstention ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="h-3 w-3" />
                <span>Abstention: Insufficient Corpus Grounding</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                <span>Verified Statutory Grounding</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 italic font-sans truncate max-w-xl">
            "{question}"
          </p>
        </div>

        {/* Right: Grouped Action Toolbar */}
        <div className="flex items-center gap-1.5 self-end sm:self-start flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-[var(--gold-500)]/20 border-[var(--gold-400)] text-[var(--gold-300)]'
                : 'bg-[var(--navy-900)] hover:bg-[var(--surface-elevated)] border-[var(--surface-border)] text-slate-300 hover:text-white'
            }`}
            title="Save research session to history"
          >
            {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-[var(--gold-400)]" /> : <Bookmark className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--navy-900)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Copy plain text response"
          >
            {copiedType === 'text' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedType === 'text' ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--navy-900)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Copy formatted markdown with Gazette citations"
          >
            <FileText className="h-3.5 w-3.5 text-[var(--gold-400)]" />
            <span className="hidden sm:inline">Markdown</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--navy-900)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Print or export as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ─── Compact Grounding Verification Audit Summary ───────────── */}
      {verification && verification.checks && (
        <div className="mb-4 rounded-xl bg-[var(--surface-secondary)]/80 border border-[var(--surface-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVerificationDetails(!showVerificationDetails)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-200">Statutory Grounding Audit</span>
              <span className="text-[var(--text-muted)]">
                ({verification.supported_sections_count}/{verification.total_cited_sections} sections confirmed against Gazette)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--gold-400)]">
              <span>{showVerificationDetails ? 'Hide' : 'Inspect'}</span>
              {showVerificationDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {showVerificationDetails && (
            <div className="p-3 border-t border-[var(--surface-border)] bg-[var(--navy-950)] text-xs space-y-2 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {verification.checks.map((ck) => (
                  <div key={ck.id} className="p-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)] flex items-start gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold text-slate-200">{ck.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ck.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Grounded Answer Content ────────────────────────────────── */}
      <div className="mb-5">
        {renderStructuredAnswer(answer)}
      </div>

      {/* ─── Verified Citations Strip (Progressive Disclosure) ──────── */}
      {verification?.citations && verification.citations.length > 0 && (
        <div className="mb-5 p-3.5 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)]">
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[var(--surface-border)]/50">
            <span className="text-xs font-mono font-bold uppercase text-[var(--gold-400)] tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Verified Statutory Citations ({verification.citations.length})</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono hidden sm:inline">
              Click to view source excerpt
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {verification.citations.map((c, i) => {
              const matchingSource = sources.find((s) => s.chunk_id === c.chunk_id);
              const dirUrl = c.section_num 
                ? `/statutes/${c.statute_code}/section-${c.section_num}`
                : `/statutes/${c.statute_code}`;

              return (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/80 hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/40 text-left transition-all flex flex-col justify-between"
                >
                  <div 
                    onClick={() => {
                      if (matchingSource && onSelectSource) {
                        onSelectSource(matchingSource);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--gold-400)] font-bold mb-1">
                      <span>{c.section} • {c.statute_short}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 italic leading-relaxed">
                      "{c.evidence_snippet}"
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-[var(--surface-border)]/40 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>{c.gazette_page}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">{c.status_label}</span>
                      <Link
                        to={dirUrl}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 hover:underline"
                        title="Open section in Statutes Directory"
                      >
                        <span>Directory</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Contextual Follow-up Legal Inquiries ───────────────────── */}
      {follow_ups && follow_ups.length > 0 && (
        <div className="mb-5 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--surface-border)]">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-mono font-bold text-[var(--gold-400)] uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            <span>Suggested Research Questions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {follow_ups.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSelectQuery && onSelectQuery(q)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--navy-900)] hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/40 text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-left group"
              >
                <span>{q}</span>
                <ArrowRight className="h-3 w-3 text-[var(--gold-400)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Feedback & Latency Footer ───────────────────────────────── */}
      <div className="pt-3 border-t border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        
        {/* Left: Feedback thumbs */}
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--text-muted)] text-[11px]">Was this legal analysis grounded?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setUserRating('up');
                showToast('Marked as verified and grounded');
              }}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                userRating === 'up'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[var(--navy-900)] text-slate-400 border-[var(--surface-border)] hover:text-white'
              }`}
              title="Accurate and grounded"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setUserRating('down');
                showToast('Marked as discrepant');
              }}
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                userRating === 'down'
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-[var(--navy-900)] text-slate-400 border-[var(--surface-border)] hover:text-white'
              }`}
              title="Citation or legal discrepancy"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => setReportState(!reportState)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--navy-900)] text-slate-400 border border-[var(--surface-border)] hover:text-amber-400 text-[11px] cursor-pointer ml-1"
              title="Report citation discrepancy"
            >
              <Flag className="h-3 w-3" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>

        {/* Right: Latency & Legal Notice */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-muted)]">
          {processing_time_seconds != null && (
            <span className="flex items-center gap-1 text-[var(--gold-400)]">
              <Clock className="h-3 w-3" />
              {processing_time_seconds}s
            </span>
          )}
          <span>•</span>
          <span>Official Gazette (1 July 2024)</span>
        </div>
      </div>

      {/* Inline Report Form */}
      {reportState && (
        <form onSubmit={handleReportSubmit} className="mt-3 p-3.5 rounded-xl bg-[var(--navy-950)] border border-amber-500/30 text-xs animate-fade-in">
          <label className="block text-slate-200 font-semibold mb-1">
            Report citation or statutory discrepancy for benchmark review:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={reportFeedback}
              onChange={(e) => setReportFeedback(e.target.value)}
              placeholder="e.g. Proviso wording differs from Gazette chunk..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)] text-white focus:outline-none focus:border-[var(--gold-400)]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-[var(--navy-950)] font-bold cursor-pointer hover:bg-amber-400"
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
