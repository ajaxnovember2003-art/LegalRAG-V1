import { AlertTriangle, RefreshCw, Terminal, KeyRound } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error?.message || 'An unknown error occurred.';

  const isGeminiKeyMissing = 
    typeof errorMessage === 'string' && errorMessage.includes('GEMINI_API_KEY');

  const isConnectionRefused = 
    typeof errorMessage === 'string' && 
    (errorMessage.includes('offline') || errorMessage.includes('Cannot connect') || errorMessage.includes('Network Error'));

  return (
    <div className="legal-card border-[var(--error)]/50 bg-[var(--surface-secondary)] animate-fade-in p-6 sm:p-7 shadow-xl" role="alert">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--error)]/15 border border-[var(--error)]/30 text-[var(--error)] shrink-0">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Query Processing Encountered an Issue
          </h3>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2 leading-relaxed">
            {errorMessage}
          </p>

          {isGeminiKeyMissing && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--gold-400)] font-bold mb-1.5">
                <KeyRound className="h-4 w-4" />
                <span>How to set your Gemini API Key</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-2.5 leading-relaxed">
                Add your key to the <code className="text-[var(--gold-300)] font-mono">.env</code> file in the project root:
              </p>
              <code className="block font-mono text-xs sm:text-sm text-[var(--text-primary)] bg-[var(--navy-900)] p-3 rounded-lg border border-[var(--surface-border)] select-all mb-2">
                GEMINI_API_KEY=your_gemini_api_key_here
              </code>
              <p className="text-xs text-[var(--text-muted)]">
                Once saved, simply click the <strong>Retry Query</strong> button below — the backend will automatically detect it.
              </p>
            </div>
          )}

          {isConnectionRefused && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)]">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--gold-400)] font-bold mb-1.5">
                <Terminal className="h-4 w-4" />
                <span>Backend Startup Command</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-2.5">
                Make sure the LegalRAG API server is running on port 8000:
              </p>
              <code className="block font-mono text-xs sm:text-sm text-[var(--text-primary)] bg-[var(--navy-900)] p-3 rounded-lg border border-[var(--surface-border)] select-all">
                python -m src.api
              </code>
            </div>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-400)] text-[var(--navy-950)] text-sm sm:text-base font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Query</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
