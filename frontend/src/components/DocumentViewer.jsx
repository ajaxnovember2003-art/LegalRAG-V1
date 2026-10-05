import { useEffect, useState } from 'react';
import { 
  X, 
  FileText, 
  Copy, 
  Check, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Hash, 
  ExternalLink 
} from 'lucide-react';
import { formatSourceName, formatPageRange, formatScore } from '../utils/formatters';

export default function DocumentViewer({ source, onClose }) {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!source) return null;

  const actName = formatSourceName(source.source);
  const pageRange = formatPageRange(source);
  const rerankScore = formatScore(source.rerank_score);
  const rrfScore = source.rrf_score ? Number(source.rrf_score).toFixed(4) : null;
  const passage = source.text || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(passage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight search term in passage if present
  const renderHighlightedPassage = () => {
    if (!searchTerm.trim()) {
      return passage;
    }
    const parts = passage.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-[var(--gold-500)]/50 text-[var(--text-primary)] rounded px-1 py-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--surface-primary)] border border-[var(--surface-border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--surface-border)] bg-[var(--surface-secondary)]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 text-[var(--gold-400)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="document-viewer-title" className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                {actName}
              </h2>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                <span className="font-mono text-[var(--navy-200)] font-medium">{source.source}</span>
                {pageRange && (
                  <>
                    <span>•</span>
                    <span className="text-[var(--text-secondary)] font-medium">{pageRange}</span>
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

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--navy-800)] border border-[var(--surface-border)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--gold-400)] transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Copy Passage'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-800)] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Retrieval Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 border-b border-[var(--surface-border)] bg-[var(--navy-950)] text-xs sm:text-sm">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)] block mb-0.5">Cross-Encoder</span>
            <span className="font-mono text-[var(--gold-400)] font-bold">
              {rerankScore ?? 'N/A (Window ±1)'}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)] block mb-0.5">RRF Rank Score</span>
            <span className="font-mono text-[var(--navy-100)] font-bold">
              {rrfScore ?? 'N/A (Window ±1)'}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)] block mb-0.5">Semantic Rank</span>
            <span className="font-mono text-[var(--navy-200)] font-medium">
              {source.semantic_rank ? `#${source.semantic_rank}` : 'Expanded window'}
            </span>
          </div>
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-muted)] block mb-0.5">BM25 Rank</span>
            <span className="font-mono text-[var(--navy-200)] font-medium">
              {source.bm25_rank ? `#${source.bm25_rank}` : 'Expanded window'}
            </span>
          </div>
        </div>

        {/* Search within passage */}
        <div className="px-6 py-3 border-b border-[var(--surface-border)] bg-[var(--surface-secondary)]/70">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords within this statutory passage..."
            className="w-full px-4 py-2 rounded-xl bg-[var(--surface-primary)] border border-[var(--surface-border)] text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-400)]"
          />
        </div>

        {/* Passage Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl bg-[var(--navy-950)] p-6 border border-[var(--surface-border)] font-mono text-sm sm:text-base text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap select-text shadow-inner">
            {renderHighlightedPassage()}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-secondary)] flex items-center justify-between text-xs sm:text-sm text-[var(--text-muted)]">
          <span>Codified Legal Corpus: BNS, BNSS, BSA (2023)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--navy-800)] text-[var(--text-primary)] hover:bg-[var(--navy-700)] transition-colors font-semibold cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
