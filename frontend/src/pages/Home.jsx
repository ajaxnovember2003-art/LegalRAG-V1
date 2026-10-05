import { useState } from 'react';
import { useLegalRAG } from '../hooks/useLegalRAG';
import SearchBar from '../components/SearchBar';
import QuerySuggestions from '../components/QuerySuggestions';
import AnswerCard from '../components/AnswerCard';
import SourcesPanel from '../components/SourcesPanel';
import RetrievalTrace from '../components/RetrievalTrace';
import EvidencePanel from '../components/EvidencePanel';
import DocumentViewer from '../components/DocumentViewer';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

export default function Home({ selectedHistoryQuery }) {
  const {
    query,
    result,
    loading,
    error,
    ask,
    clear,
  } = useLegalRAG();

  const [activeDocument, setActiveDocument] = useState(null);

  // Handle submitting query from SearchBar
  const handleSubmit = (queryString) => {
    ask(queryString);
  };

  // Handle retry
  const handleRetry = () => {
    if (query) {
      ask(query);
    }
  };

  // Inspect source passage in modal
  const handleInspectDocument = (source) => {
    setActiveDocument(source);
  };

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-10 py-6 sm:py-10">
      {/* Search Bar section */}
      <section className="mb-6 sm:mb-8" aria-label="Search Legal Knowledge Base">
        <SearchBar
          onSubmit={handleSubmit}
          loading={loading}
          initialQuery={selectedHistoryQuery}
        />
      </section>

      {/* Query Suggestions (when not loading and no result) */}
      {!loading && !result && !error && (
        <section className="mb-8" aria-label="Example Legal Queries">
          <QuerySuggestions onSelect={handleSubmit} />
        </section>
      )}

      {/* Loading state */}
      {loading && <LoadingState query={query} />}

      {/* Error state */}
      {error && !loading && (
        <ErrorState error={error} onRetry={handleRetry} />
      )}

      {/* Empty state (no query yet) */}
      {!loading && !result && !error && (
        <EmptyState onSelectExample={handleSubmit} />
      )}

      {/* Active Results Display */}
      {!loading && result && (
        <div className="space-y-6">
          {/* Main Grounded Answer */}
          <AnswerCard result={result} />

          {/* Evidence Breakdown & Badges */}
          <EvidencePanel
            sources={result.sources}
            onSelectSource={handleInspectDocument}
          />

          {/* Pipeline Architectural Trace */}
          <RetrievalTrace
            stages={result.pipeline_stages}
            processingTime={result.processing_time_seconds}
            sourcesCount={result.sources?.length}
          />

          {/* Detailed Retrieved Statutes Panel */}
          <SourcesPanel
            sources={result.sources}
            onViewDocument={handleInspectDocument}
          />
        </div>
      )}

      {/* Full Document / Passage Inspector Modal */}
      {activeDocument && (
        <DocumentViewer
          source={activeDocument}
          onClose={() => setActiveDocument(null)}
        />
      )}
    </div>
  );
}
