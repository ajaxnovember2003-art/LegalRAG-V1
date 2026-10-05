import { useState, useEffect } from 'react';
import { 
  Clock, 
  Trash2, 
  BookOpen, 
  ArrowRight, 
  Sparkles, 
  Bookmark, 
  BookmarkX,
  ChevronLeft, 
  ChevronRight,
  X,
  History,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTimeAgo, truncateText } from '../utils/formatters';

const POPULAR_LOOKUPS = [
  {
    topic: 'Punishment for murder',
    section: 'Sec 103 BNS',
    query: 'What is the punishment for murder under Section 103 of BNS 2023?'
  },
  {
    topic: 'Zero FIR procedure',
    section: 'Sec 173 BNSS',
    query: 'What is the procedure for zero FIR under BNSS 2023?'
  },
  {
    topic: 'Electronic records proof',
    section: 'Sec 63 BSA',
    query: 'How is electronic evidence made admissible under Section 63 of BSA 2023?'
  },
  {
    topic: 'Bail in non-bailable offence',
    section: 'Sec 480 BNSS',
    query: 'What are the conditions for grant of bail under Section 480 BNSS?'
  }
];

export default function Sidebar({ 
  recentSearches = [], 
  onSelectQuery, 
  onClearHistory, 
  onDeleteQuery,
  mobileOpen = false,
  onCloseMobile 
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'saved'
  const [bookmarks, setBookmarks] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  // Load saved bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('legalrag_bookmarks') || '[]');
      setBookmarks(saved);
    } catch {
      setBookmarks([]);
    }
  }, []);

  const handleClear = () => {
    if (confirmClear) {
      onClearHistory();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  const handleRemoveBookmark = (e, question) => {
    e.stopPropagation();
    try {
      const updated = bookmarks.filter((b) => b.question !== question);
      localStorage.setItem('legalrag_bookmarks', JSON.stringify(updated));
      setBookmarks(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHistory = (e, question) => {
    e.stopPropagation();
    if (onDeleteQuery) {
      onDeleteQuery(question);
    }
  };

  // ─── Collapsed State on Desktop ──────────────────────────────
  if (collapsed) {
    return (
      <aside 
        className="hidden lg:flex w-14 flex-col items-center py-4 border-r border-[var(--surface-border)] bg-[var(--surface-primary)] justify-between select-none shrink-0"
        aria-label="Collapsed sidebar"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-[var(--gold-400)] hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Expand sidebar (Search history)"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => { setCollapsed(false); setActiveTab('recent'); }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'recent' ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/15' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
            title="Recent Searches"
          >
            <Clock className="h-4 w-4" />
          </button>

          <button
            onClick={() => { setCollapsed(false); setActiveTab('saved'); }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTab === 'saved' ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/15' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
            title="Saved Research"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        <Link
          to="/statutes"
          className="p-2 rounded-lg text-slate-400 hover:text-[var(--gold-400)] hover:bg-white/[0.04] transition-colors"
          title="Browse Statutes Directory"
        >
          <BookOpen className="h-4 w-4" />
        </Link>
      </aside>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Top Header & Tab Controls */}
      <div className="p-3 border-b border-[var(--surface-border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)] text-xs flex-1">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-[var(--gold-500)]/20 text-[var(--gold-400)] font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Recent</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-1 px-2 rounded-md font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-[var(--gold-500)]/20 text-[var(--gold-400)] font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="h-3 w-3" />
            <span>Saved ({bookmarks.length})</span>
          </button>
        </div>

        {/* Collapse button on desktop, Close on mobile */}
        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            setCollapsed(true);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer shrink-0"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4 hidden lg:block" />
          <X className="h-4 w-4 lg:hidden" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        
        {/* TAB 1: RECENT SEARCHES */}
        {activeTab === 'recent' && (
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Search History</span>
              </span>

              {recentSearches.length > 0 && (
                <button
                  onClick={handleClear}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer font-mono ${
                    confirmClear 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' 
                      : 'text-[var(--text-muted)] hover:text-red-400'
                  }`}
                  title={confirmClear ? "Click again to confirm" : "Clear all history"}
                >
                  {confirmClear ? 'Confirm?' : 'Clear all'}
                </button>
              )}
            </div>

            {recentSearches.length > 0 ? (
              <ul className="space-y-1" role="list">
                {recentSearches.map((item, i) => (
                  <li key={`${item.question}-${i}`} className="group relative">
                    <button
                      onClick={() => {
                        onSelectQuery(item.question);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full rounded-lg px-2.5 py-2 pr-7 text-left transition-all bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--surface-border)] cursor-pointer text-xs"
                      title={item.question}
                    >
                      <p className="font-medium text-slate-200 line-clamp-2 leading-relaxed group-hover:text-white">
                        {truncateText(item.question, 75)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] group-hover:text-[var(--gold-400)]">
                        {formatTimeAgo(item.timestamp)}
                      </p>
                    </button>
                    {onDeleteQuery && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistory(e, item.question)}
                        title="Delete from history"
                        className="absolute right-1.5 top-2 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label="Remove search"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 px-1 py-2">
                <p className="text-xs text-[var(--text-muted)] italic">
                  No previous searches.
                </p>
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold-400)] font-bold block mb-1">
                    Quick Legal Lookups
                  </span>
                  {POPULAR_LOOKUPS.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelectQuery(item.query);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="group w-full rounded-lg p-2 text-left transition-all bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-elevated)] border border-[var(--surface-border)]/60 hover:border-[var(--gold-400)]/40 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--gold-400)] font-bold">
                        <span>{item.section}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-slate-200 truncate mt-0.5">
                        {item.topic}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED RESEARCH SESSIONS */}
        {activeTab === 'saved' && (
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold-400)] font-semibold flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span>Saved Research</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {bookmarks.length} saved
              </span>
            </div>

            {bookmarks.length > 0 ? (
              <ul className="space-y-1" role="list">
                {bookmarks.map((b, i) => (
                  <li key={`${b.question}-${i}`} className="group relative">
                    <button
                      onClick={() => {
                        onSelectQuery(b.question);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full rounded-lg px-2.5 py-2 pr-7 text-left transition-all bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-elevated)] border border-[var(--gold-500)]/20 hover:border-[var(--gold-400)]/40 cursor-pointer text-xs"
                      title={b.question}
                    >
                      <p className="font-medium text-slate-200 line-clamp-2 leading-relaxed group-hover:text-white">
                        {truncateText(b.question, 75)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[var(--gold-400)]">
                        {formatTimeAgo(b.timestamp)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBookmark(e, b.question)}
                      title="Remove bookmark"
                      className="absolute right-1.5 top-2 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove bookmark"
                    >
                      <BookmarkX className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 rounded-lg bg-[var(--surface-secondary)]/30 border border-[var(--surface-border)] text-center text-xs text-[var(--text-muted)] space-y-1.5">
                <Bookmark className="h-5 w-5 mx-auto text-slate-500" />
                <p>No saved research sessions yet.</p>
                <p className="text-[11px] text-slate-500">
                  Click the "Save" icon on any legal answer to bookmark it here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Directory Quick-Link Footer */}
      <div className="p-3 border-t border-[var(--surface-border)] bg-[var(--navy-950)]">
        <Link
          to="/statutes"
          onClick={() => { if (onCloseMobile) onCloseMobile(); }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[var(--gold-400)]" />
            <span className="font-medium">Statutes Directory</span>
          </span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (lg+) */}
      <aside 
        className="hidden lg:flex w-64 flex-col border-r border-[var(--surface-border)] bg-[var(--surface-primary)] select-none shrink-0"
        aria-label="Sidebar navigation and history"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible when mobileOpen is true) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-[var(--surface-primary)] border-r border-[var(--surface-border)] h-full shadow-2xl animate-slide-left z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
