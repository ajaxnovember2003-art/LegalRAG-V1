import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  BookOpen, 
  Copy, 
  Check, 
  History, 
  Scale, 
  FileText, 
  Layers,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  ArrowRightLeft,
  Sparkles,
  Info
} from 'lucide-react';
import { getStatutes, getStatuteSections, getHistoricalMappings, getSectionDetail } from '../services/api';

const QUICK_TOPIC_FILTERS = [
  { label: 'All Provisions', query: '' },
  { label: 'Definitions (Sec 2)', query: 'Definitions' },
  { label: 'Offences Against Body', query: 'murder' },
  { label: 'Property & Cheating', query: 'theft' },
  { label: 'Bail & Custody', query: 'bail' },
  { label: 'Electronic Records', query: 'electronic' },
  { label: 'Arrest & FIR', query: 'arrest' }
];

export default function Document({ onSelectQuery }) {
  const { actCode, sectionSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Active view: 'sections' | 'mappings'
  const [activeTab, setActiveTab] = useState('sections');
  const [selectedStatute, setSelectedStatute] = useState(actCode || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopicFilter, setActiveTopicFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Historical concordance search & filter
  const [concordanceSearch, setConcordanceSearch] = useState('');
  const [concordanceTypeFilter, setConcordanceTypeFilter] = useState('ALL');

  // Data state
  const [statutes, setStatutes] = useState([]);
  const [sectionsData, setSectionsData] = useState({ total: 0, sections: [] });
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected section for detailed modal
  const [inspectSection, setInspectSection] = useState(null);
  const [loadingSectionDetail, setLoadingSectionDetail] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [copiedModalText, setCopiedModalText] = useState(false);

  const searchInputRef = useRef(null);

  // Load Statutes and Mappings on mount
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const [statutesRes, mappingsRes] = await Promise.all([
          getStatutes().catch(() => []),
          getHistoricalMappings().catch(() => []),
        ]);
        setStatutes(statutesRes);
        setMappings(mappingsRes);
      } catch (err) {
        setError('Failed to connect to the statutory catalog.');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Synchronize statute selection with URL parameter
  useEffect(() => {
    if (actCode) {
      setSelectedStatute(actCode);
    } else {
      setSelectedStatute('all');
    }
  }, [actCode]);

  // Load sections based on selected statute and search query with debouncing
  useEffect(() => {
    let isCancelled = false;
    setIsSearching(true);

    async function fetchSections() {
      try {
        const res = await getStatuteSections(selectedStatute, searchQuery, 60, 0);
        if (!isCancelled) {
          setSectionsData(res);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching sections:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }

    const timer = setTimeout(fetchSections, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedStatute, searchQuery]);

  // Handle URL slug or query param section inspection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const targetSec = sectionSlug 
      ? sectionSlug.replace('section-', '') 
      : searchParams.get('section');

    if (targetSec) {
      const code = (selectedStatute && selectedStatute !== 'all') ? selectedStatute : (actCode || 'bns-2023');
      setLoadingSectionDetail(true);
      getSectionDetail(code, targetSec)
        .then((sec) => {
          if (sec) {
            setInspectSection(sec);
          } else if (sectionsData.sections.length > 0) {
            const match = sectionsData.sections.find(
              (s) => s.section_number === targetSec || s.slug === `section-${targetSec}`
            );
            if (match) setInspectSection(match);
          }
        })
        .catch(() => {
          if (sectionsData.sections.length > 0) {
            const match = sectionsData.sections.find(
              (s) => s.section_number === targetSec || s.slug === `section-${targetSec}`
            );
            if (match) setInspectSection(match);
          }
        })
        .finally(() => {
          setLoadingSectionDetail(false);
        });
    }
  }, [sectionSlug, location.search, actCode, selectedStatute, sectionsData]);

  // Handle keyboard shortcuts (Esc to close modal, / to focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && inspectSection) {
        setInspectSection(null);
      }
      if (e.key === '/' && !inspectSection && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectSection]);

  const handleCopyCitation = (sec) => {
    const citation = `Section ${sec.section_number}, ${sec.statute_name || sec.statute_short} (${sec.gazette_page || 'Gazette of India'})`;
    navigator.clipboard.writeText(citation);
    setCopiedSection(sec.section_number);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyModalText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedModalText(true);
    setTimeout(() => setCopiedModalText(false), 2000);
  };

  // Navigate to previous or next section in inspection modal
  const handleNavigateSection = async (direction) => {
    if (!inspectSection || sectionsData.sections.length === 0) return;
    const currentIndex = sectionsData.sections.findIndex(
      (s) => s.section_number === inspectSection.section_number && s.statute_code === inspectSection.statute_code
    );

    let nextTarget = null;
    if (currentIndex >= 0) {
      if (direction === 'prev' && currentIndex > 0) {
        nextTarget = sectionsData.sections[currentIndex - 1];
      } else if (direction === 'next' && currentIndex < sectionsData.sections.length - 1) {
        nextTarget = sectionsData.sections[currentIndex + 1];
      }
    }

    if (nextTarget) {
      setLoadingSectionDetail(true);
      try {
        const fullDetail = await getSectionDetail(nextTarget.statute_code, nextTarget.section_number);
        setInspectSection(fullDetail || nextTarget);
      } catch {
        setInspectSection(nextTarget);
      } finally {
        setLoadingSectionDetail(false);
      }
    }
  };

  // Filtered concordance mappings
  const filteredMappings = useMemo(() => {
    let result = mappings;
    if (selectedStatute !== 'all') {
      result = result.filter((m) => m.statute_code === selectedStatute);
    }
    if (concordanceTypeFilter !== 'ALL') {
      result = result.filter((m) => m.correspondence === concordanceTypeFilter);
    }
    if (concordanceSearch.trim()) {
      const q = concordanceSearch.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.new_section?.toLowerCase().includes(q) ||
          m.old_section?.toLowerCase().includes(q) ||
          m.new_title?.toLowerCase().includes(q) ||
          m.old_title?.toLowerCase().includes(q) ||
          m.notes?.toLowerCase().includes(q) ||
          m.new_statute?.toLowerCase().includes(q) ||
          m.old_statute?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [mappings, selectedStatute, concordanceTypeFilter, concordanceSearch]);

  // Total sections across all statutes
  const totalCatalogedCount = useMemo(() => {
    if (statutes.length > 0) {
      return statutes.reduce((sum, act) => sum + (act.cataloged_sections_count || 0), 0);
    }
    return 1059;
  }, [statutes]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fade-in text-[var(--text-primary)]">
      
      {/* ─── Compact Header ────────────────────────────────────────── */}
      <div className="mb-6 border-b border-[var(--surface-border)] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gold-400)] px-2 py-0.5 rounded bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/20">
                Official Gazette Corpus
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {totalCatalogedCount}+ Indexed Sections
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Statutes Directory & Concordance
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Explore verified statutory provisions and authoritative transition mappings across the Bharatiya Nyaya Sanhita (BNS), BNSS, and BSA 2023.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] shrink-0 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('sections')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sections'
                  ? 'bg-[var(--gold-500)] text-[var(--navy-950)] shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Statutory Sections</span>
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'mappings'
                  ? 'bg-[var(--gold-500)] text-[var(--navy-950)] shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Historical Concordance</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Refined Act Selector Segmented Cards ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6" role="tablist" aria-label="Filter by Criminal Statute">
        <button
          onClick={() => {
            setSelectedStatute('all');
            navigate('/statutes');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            selectedStatute === 'all'
              ? 'bg-[var(--surface-elevated)] border-[var(--gold-400)] shadow-md ring-1 ring-[var(--gold-400)]/40'
              : 'bg-[var(--surface-secondary)] border-[var(--surface-border)] hover:border-slate-500'
          }`}
          role="tab"
          aria-selected={selectedStatute === 'all'}
        >
          {selectedStatute === 'all' && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--gold-400)]" />
          )}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[var(--gold-400)]">All Sanhitas</span>
            <span className="font-mono text-[10px] text-slate-400 bg-[var(--navy-950)] px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
              All Acts
            </span>
          </div>
          <p className="text-xs text-slate-200 font-semibold truncate">Comprehensive Corpus</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">BNS • BNSS • BSA (2023)</p>
        </button>

        {statutes.map((act) => {
          const isSelected = selectedStatute === act.code;
          return (
            <button
              key={act.code}
              onClick={() => {
                setSelectedStatute(act.code);
                navigate(`/statutes/${act.code}`);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-[var(--surface-elevated)] border-[var(--gold-400)] shadow-md ring-1 ring-[var(--gold-400)]/40'
                  : 'bg-[var(--surface-secondary)] border-[var(--surface-border)] hover:border-slate-500'
              }`}
              role="tab"
              aria-selected={isSelected}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--gold-400)]" />
              )}
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[var(--gold-400)]">{act.short_name}</span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {act.cataloged_sections_count} sections
                </span>
              </div>
              <h3 className="text-xs font-bold text-white truncate">{act.full_name}</h3>
              <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{act.replaces}</p>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: Statutory Sections Explorer ─────────────────────── */}
      {activeTab === 'sections' && (
        <section aria-label="Statutory Section Catalog">
          {/* Search bar & quick filter pills */}
          <div className="space-y-3 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveTopicFilter('');
                  }}
                  placeholder="Search by section number (e.g. 103, 173, 2(28)), title, or keyword..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-xs sm:text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-400)] focus:ring-1 focus:ring-[var(--gold-400)]/40 transition-all"
                />
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTopicFilter('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 border border-[var(--surface-border)] rounded px-1.5 py-0.5 hidden sm:inline-block">
                    /
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] shrink-0 self-end sm:self-auto">
                {isSearching && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Searching...</span>
                  </span>
                )}
                <span>{sectionsData.total} sections found</span>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTopicFilter('');
                    }}
                    className="text-[var(--gold-400)] hover:underline cursor-pointer ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Quick Topic Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Quick filters:
              </span>
              {QUICK_TOPIC_FILTERS.map((topic, i) => {
                const isActive = activeTopicFilter === topic.label || (!activeTopicFilter && searchQuery === topic.query);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(topic.query);
                      setActiveTopicFilter(topic.label);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                      isActive
                        ? 'bg-[var(--gold-500)]/20 text-[var(--gold-300)] border border-[var(--gold-500)]/40 font-semibold'
                        : 'bg-[var(--surface-secondary)] text-slate-400 hover:text-white border border-[var(--surface-border)]'
                    }`}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sections Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sectionsData.sections.map((sec) => (
              <article
                key={`${sec.statute_code}-${sec.section_number}`}
                className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/40 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[var(--gold-400)] bg-[var(--gold-500)]/10 px-2 py-0.5 rounded border border-[var(--gold-500)]/20">
                      Section {sec.section_number}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--navy-950)] px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
                      {sec.statute_short}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white mb-2 line-clamp-1 group-hover:text-[var(--gold-300)] transition-colors">
                    {sec.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-sans mb-3 text-slate-300/90">
                    "{sec.excerpt}"
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--surface-border)]/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-400">
                    {sec.gazette_page || 'Official Gazette'}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyCitation(sec)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[var(--navy-800)] transition-colors cursor-pointer"
                      title="Copy legal citation"
                      aria-label="Copy citation"
                    >
                      {copiedSection === sec.section_number ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setInspectSection(sec)}
                      className="text-[11px] font-bold text-[var(--gold-400)] hover:text-[var(--gold-300)] flex items-center gap-1 cursor-pointer px-2 py-1 rounded bg-[var(--gold-500)]/10 hover:bg-[var(--gold-500)]/20 transition-colors"
                    >
                      <span>Read full</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {sectionsData.sections.length === 0 && !isSearching && (
            <div className="p-12 text-center rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-sm text-[var(--text-muted)] space-y-3">
              <BookOpen className="h-8 w-8 mx-auto text-slate-500" />
              <p className="text-slate-300 font-medium">No statutory sections match your current query.</p>
              <p className="text-xs text-slate-500">
                Try searching by a section number (e.g. 103, 173), general term (e.g. murder, theft, bail), or clear the search filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTopicFilter('');
                  setSelectedStatute('all');
                }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--navy-800)] text-xs text-[var(--gold-400)] border border-[var(--gold-500)]/30 hover:bg-[var(--navy-750)] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      )}

      {/* ─── TAB 2: Historical Concordance Tables ────────────────────── */}
      {activeTab === 'mappings' && (
        <section className="space-y-4" aria-label="Historical Statutory Concordance">
          {/* Concordance Header Banner */}
          <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-xs sm:text-sm text-slate-300 flex items-start gap-3">
            <Info className="h-5 w-5 text-[var(--gold-400)] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white">Authoritative Transition Guidance:</strong> The 2023 criminal codes repeal the Indian Penal Code (1860), Code of Criminal Procedure (1973), and Indian Evidence Act (1872). Below is the verified section-level correspondence with substantive legal analysis.
            </div>
          </div>

          {/* Concordance Search and Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={concordanceSearch}
                onChange={(e) => setConcordanceSearch(e.target.value)}
                placeholder="Search IPC/CrPC or BNS section (e.g. 302, 103, 420)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-xs sm:text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold-400)]"
              />
              {concordanceSearch && (
                <button
                  onClick={() => setConcordanceSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Correspondence Type Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--navy-900)] border border-[var(--surface-border)] text-xs overflow-x-auto">
              {[
                { label: 'All Transitions', val: 'ALL' },
                { label: 'Direct', val: 'DIRECT_CORRESPONDENCE' },
                { label: 'Modified', val: 'SUBSTANTIVELY_MODIFIED' },
                { label: 'New Law', val: 'NEW_PROVISION' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => setConcordanceTypeFilter(tab.val)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer text-xs ${
                    concordanceTypeFilter === tab.val
                      ? 'bg-[var(--gold-500)] text-[var(--navy-950)] font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Concordance Items Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {filteredMappings.map((map, idx) => {
              const isDirect = map.correspondence === 'DIRECT_CORRESPONDENCE';
              const isNew = map.correspondence === 'NEW_PROVISION';

              return (
                <article
                  key={idx}
                  className="p-5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/30 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-[var(--surface-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isDirect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isNew
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {map.correspondence_label}
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {map.new_statute} Transition
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onSelectQuery && onSelectQuery(`Explain how ${map.new_statute} Section ${map.new_section} compares to ${map.old_statute} Section ${map.old_section}.`);
                        navigate('/');
                      }}
                      className="text-xs font-bold text-[var(--gold-400)] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <span>Analyze difference in Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    {/* New Law */}
                    <div className="p-3.5 rounded-xl bg-[var(--navy-950)] border border-[var(--gold-500)]/25">
                      <span className="text-[10px] font-mono uppercase text-[var(--gold-400)] font-bold block mb-1">
                        Enacted Law (2023)
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {map.new_statute} Section {map.new_section}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {map.new_title}
                      </p>
                    </div>

                    {/* Old Law */}
                    <div className="p-3.5 rounded-xl bg-[var(--navy-900)] border border-[var(--surface-border)]">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Repealed Colonial Law
                      </span>
                      <h4 className="text-sm font-bold text-slate-200">
                        {map.old_statute} Section {map.old_section}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {map.old_title}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-[var(--navy-950)]/60 p-3 rounded-lg border border-[var(--surface-border)]/50">
                    <strong className="text-[var(--gold-400)]">Substantive Analysis: </strong>
                    {map.notes}
                  </p>
                </article>
              );
            })}

            {filteredMappings.length === 0 && (
              <div className="p-10 text-center rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] text-sm text-[var(--text-muted)] space-y-2">
                <History className="h-7 w-7 mx-auto text-slate-500" />
                <p>No historical transition mappings match your search.</p>
                <button
                  onClick={() => {
                    setConcordanceSearch('');
                    setConcordanceTypeFilter('ALL');
                  }}
                  className="text-xs text-[var(--gold-400)] hover:underline cursor-pointer"
                >
                  Clear concordance search
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Detailed Section Inspection Modal ─────────────────────── */}
      {inspectSection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-section-title"
        >
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[var(--surface-primary)] border border-[var(--surface-border)] shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)] bg-[var(--surface-secondary)]">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--gold-400)]">
                  {inspectSection.statute_short} • Section {inspectSection.section_number}
                </span>
                <h2 id="modal-section-title" className="text-lg font-bold text-white mt-0.5">
                  {inspectSection.title}
                </h2>
              </div>
              <button
                onClick={() => setInspectSection(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[var(--navy-800)] cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Metadata Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-muted)] bg-[var(--navy-950)] p-3 rounded-xl border border-[var(--surface-border)]">
                <span>Gazette Ref: {inspectSection.gazette_page || 'Official Gazette of India'}</span>
                <span>•</span>
                <span>Chunk ID: #{inspectSection.chunk_id ?? 'N/A'}</span>
                <span>•</span>
                <span>Source File: {inspectSection.source_file || inspectSection.statute_code}</span>
              </div>

              {/* Historical Equivalence Callout */}
              {inspectSection.historical_mapping && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-400" />
                    <strong>Historical Equivalence: </strong>
                  </div>
                  Replaces {inspectSection.historical_mapping.old_statute} Section {inspectSection.historical_mapping.old_section} ({inspectSection.historical_mapping.correspondence_label}).
                  {inspectSection.historical_mapping.notes && (
                    <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                      {inspectSection.historical_mapping.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Verbatim Statutory Excerpt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--gold-400)] font-bold">
                    Official Gazette Statutory Text (Verbatim)
                  </span>
                  <button
                    onClick={() => handleCopyModalText(inspectSection.full_chunk_text || inspectSection.excerpt)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedModalText ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied text</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy verbatim text</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-4 rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)] text-xs sm:text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap select-text">
                  {inspectSection.full_chunk_text || inspectSection.excerpt}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions and Prev/Next Navigation */}
            <div className="px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-secondary)] flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Prev / Next navigation buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleNavigateSection('prev')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--navy-900)] text-xs text-slate-300 hover:text-white hover:bg-[var(--navy-800)] border border-[var(--surface-border)] cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateSection('next')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--navy-900)] text-xs text-slate-300 hover:text-white hover:bg-[var(--navy-800)] border border-[var(--surface-border)] cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleCopyCitation(inspectSection)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--navy-800)] text-xs text-slate-300 hover:text-white border border-[var(--surface-border)] cursor-pointer transition-colors"
                >
                  {copiedSection === inspectSection.section_number ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedSection === inspectSection.section_number ? 'Citation Copied' : 'Copy Official Citation'}</span>
                </button>

                <button
                  onClick={() => {
                    const q = `Explain Section ${inspectSection.section_number} of ${inspectSection.statute_short} (${inspectSection.title}) in detail.`;
                    setInspectSection(null);
                    onSelectQuery && onSelectQuery(q);
                    navigate('/');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold-500)] text-[var(--navy-950)] text-xs font-bold hover:bg-[var(--gold-400)] cursor-pointer transition-all shadow-xs"
                >
                  <span>Research in Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
