import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Scale, Menu, X, ShieldAlert, ExternalLink, History } from 'lucide-react';

function GithubIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

export default function Navbar({ onOpenDisclaimer, onToggleSidebar }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `relative py-1.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/10 font-semibold shadow-xs'
        : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--surface-border)] bg-[var(--navy-950)]/90 backdrop-blur-md select-none">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand & Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 group-hover:border-[var(--gold-400)]/60 transition-colors shadow-xs">
            <Scale className="h-4 w-4 text-[var(--gold-400)]" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              Legal<span className="text-[var(--gold-400)]">RAG</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono font-medium text-[var(--text-muted)] bg-[var(--navy-850)] px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
              BNS • BNSS • BSA
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClass}>
            Workspace
          </NavLink>
          <NavLink to="/statutes" className={navLinkClass}>
            Statutes Directory
          </NavLink>
          <NavLink to="/how-it-works" className={navLinkClass}>
            How It Works
          </NavLink>

          <div className="h-4 w-[1px] bg-[var(--surface-border)] mx-2" />

          {/* Legal Terms Button */}
          {onOpenDisclaimer && (
            <button
              type="button"
              onClick={onOpenDisclaimer}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--gold-400)] hover:bg-[var(--gold-500)]/10 transition-colors cursor-pointer"
              title="View statutory compliance and legal disclaimers"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Legal Notice</span>
            </button>
          )}

          {/* GitHub link */}
          <a
            href="https://github.com/ajaxnovember2003-art"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/[0.04] transition-colors"
            aria-label="GitHub repository"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile menu and history toggle */}
        <div className="flex items-center gap-1.5 md:hidden">
          {onToggleSidebar && (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-300 hover:text-[var(--gold-400)] hover:bg-[var(--navy-850)] transition-colors cursor-pointer"
              onClick={onToggleSidebar}
              title="Search History & Saved Queries"
              aria-label="Toggle history sidebar"
            >
              <History className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--navy-850)] transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <nav 
          className="border-t border-[var(--surface-border)] bg-[var(--navy-900)] px-5 py-3 md:hidden animate-fade-in space-y-1 shadow-2xl" 
          aria-label="Mobile navigation"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) => 
              `block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/15 font-semibold' : 'text-slate-300 hover:text-white'
              }`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            Workspace
          </NavLink>
          <NavLink
            to="/statutes"
            className={({ isActive }) => 
              `block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/15 font-semibold' : 'text-slate-300 hover:text-white'
              }`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            Statutes Directory
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) => 
              `block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive ? 'text-[var(--gold-400)] bg-[var(--gold-500)]/15 font-semibold' : 'text-slate-300 hover:text-white'
              }`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            How It Works
          </NavLink>

          <div className="pt-2 border-t border-[var(--surface-border)]/60 flex items-center justify-between">
            {onOpenDisclaimer && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDisclaimer();
                }}
                className="text-xs font-medium text-[var(--gold-400)] flex items-center gap-1.5 py-1"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Legal Disclaimer</span>
              </button>
            )}

            <a
              href="https://github.com/ajaxnovember2003-art"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 py-1"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
