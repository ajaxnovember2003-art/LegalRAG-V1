import { useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { useLegalRAG } from './hooks/useLegalRAG';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Research from './pages/Research';
import Document from './pages/Document';
import SearchBar from './components/SearchBar';
import AnswerCard from './components/AnswerCard';
import SourcesPanel from './components/SourcesPanel';
import RetrievalTrace from './components/RetrievalTrace';
import EvidencePanel from './components/EvidencePanel';
import DocumentViewer from './components/DocumentViewer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import EmptyState from './components/EmptyState';
import TermsModal from './components/TermsModal';

export default function App() {
  const navigate = useNavigate();
  const {
    loading,
    result,
    error,
    apiStatus,
    recentSearches,
    submitQuery,
    clearHistory,
    deleteHistoryItem,
    reset,
  } = useLegalRAG();

  const [activeDocument, setActiveDocument] = useState(null);
  const [activeQueryText, setActiveQueryText] = useState('');
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSelectQuery = (question) => {
    setActiveQueryText(question);
    submitQuery(question);
    navigate('/');
  };

  const handleInspectDocument = (source) => {
    setActiveDocument(source);
  };

  const hasActiveResult = Boolean(result || loading || error);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--navy-950)] text-[var(--text-primary)]">
      {/* Top Navigation */}
      <Navbar 
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)} 
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden w-full min-w-0">
        {/* Left Sidebar */}
        <Sidebar
          recentSearches={recentSearches}
          onSelectQuery={handleSelectQuery}
          onClearHistory={clearHistory}
          onDeleteQuery={deleteHistoryItem}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <Routes>
            {/* Primary Product: Workspace */}
            <Route
              path="/"
              element={
                <div className={`w-full max-w-5xl 2xl:max-w-6xl mx-auto px-4 sm:px-8 ${
                  !hasActiveResult 
                    ? 'w-full flex flex-col items-center pt-8 pb-10' 
                    : 'w-full py-8 sm:py-10'
                }`}>
                  {!hasActiveResult ? (
                    /* Initial Workspace Landing View with Ask Box & 3-Second Value Mockup */
                    <EmptyState onSelectExample={handleSelectQuery}>
                      <SearchBar
                        onSubmit={(q) => {
                          setActiveQueryText(q);
                          submitQuery(q);
                        }}
                        loading={loading}
                        initialQuery={activeQueryText}
                      />
                    </EmptyState>
                  ) : (
                    /* Active Workspace (Searching / Results) */
                    <div className="space-y-6 animate-fade-in">
                      {/* Top Search Bar */}
                      <section aria-label="Search Legal Knowledge Base">
                        <SearchBar
                          onSubmit={(q) => {
                            setActiveQueryText(q);
                            submitQuery(q);
                          }}
                          loading={loading}
                          initialQuery={activeQueryText}
                        />
                      </section>

                      {/* Loading state */}
                      {loading && <LoadingState query={activeQueryText} />}

                      {/* Error state: only displays when it actually blocks the user */}
                      {error && !loading && (
                        <ErrorState
                          error={error}
                          onRetry={() => {
                            if (activeQueryText) submitQuery(activeQueryText);
                          }}
                        />
                      )}

                      {/* Active Results Display with Claim-Level Citations & Feedback Loop */}
                      {!loading && result && (
                        <div className="space-y-6">
                          <AnswerCard
                            result={result}
                            onSelectSource={handleInspectDocument}
                            onSelectQuery={handleSelectQuery}
                          />

                          <EvidencePanel
                            sources={result.sources}
                            onSelectSource={handleInspectDocument}
                          />

                          <RetrievalTrace
                            stages={result.pipeline_stages}
                            processingTime={result.processing_time_seconds}
                            sourcesCount={result.sources?.length}
                          />

                          <SourcesPanel
                            sources={result.sources}
                            onViewDocument={handleInspectDocument}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Viewer Modal */}
                  {activeDocument && (
                    <DocumentViewer
                      source={activeDocument}
                      onClose={() => setActiveDocument(null)}
                    />
                  )}
                </div>
              }
            />

            {/* Secondary Supporting Pages */}
            <Route path="/how-it-works" element={<Research />} />
            <Route path="/research" element={<Research />} />
            
            {/* Statute Directory & Section Pages */}
            <Route
              path="/statutes"
              element={<Document onSelectQuery={handleSelectQuery} />}
            />
            <Route
              path="/statutes/:actCode"
              element={<Document onSelectQuery={handleSelectQuery} />}
            />
            <Route
              path="/statutes/:actCode/:sectionSlug"
              element={<Document onSelectQuery={handleSelectQuery} />}
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>

      {/* ─── Real Shipped Product Footer ───────────────────────────── */}
      <footer className="border-t border-[var(--surface-border)] bg-[var(--surface-primary)] py-4 px-6 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">LegalRAG</span>
            <span>•</span>
            <span>Indian Statutory Research System (BNS • BNSS • BSA 2023)</span>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <Link to="/statutes" className="hover:text-white transition-colors">
              Statutes Directory
            </Link>
            <Link to="/how-it-works" className="hover:text-white transition-colors">
              How it Works
            </Link>
            <button
              onClick={() => setIsDisclaimerOpen(true)}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Legal Disclaimer & Terms
            </button>
            <a
              href="https://github.com/ajaxnovember2003-art"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-[var(--surface-border)]/40 text-[11px] text-center text-slate-500 font-mono">
          Disclaimer: LegalRAG is an automated legal intelligence tool provided for research and informational purposes only. It does not constitute formal legal counsel or create an attorney-client relationship.
        </div>
      </footer>

      {/* Legal Terms & Disclaimer Modal */}
      <TermsModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
