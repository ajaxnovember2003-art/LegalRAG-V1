import { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Sparkles, 
  Cpu, 
  ArrowRight,
  BookOpen,
  Play,
  Pause,
  Box,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCheck,
  GitBranch,
  ShieldAlert,
  ArrowRightLeft,
  Check,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PIPELINE_STAGES = [
  {
    id: 0,
    number: '1',
    title: 'Statutory Passage Preparation',
    shortName: 'Passage Ingestion',
    icon: BookOpen,
    summary: 'Ingests and segments official Gazette PDF enactments into 500-character windows with 100-character overlap while preserving sections, provisos, and page references.',
    specs: [
      { label: 'Corpus Scope', val: 'Bharatiya Nyaya Sanhita, BNSS, and BSA (2023 Enactments)' },
      { label: 'Chunking Strategy', val: '500-char recursive window with 100-char overlap' },
      { label: 'Metadata Preservation', val: 'Act name, Section number, Gazette page, and Part/Chapter' }
    ],
    techDetails: 'PyMuPDF text extraction with LangChain RecursiveCharacterTextSplitter, generating indexed statutory chunks stored with rich Gazette pagination metadata.'
  },
  {
    id: 1,
    number: '2',
    title: 'Dual-Stream Retrieval',
    shortName: 'Lexical + Semantic',
    icon: Database,
    summary: 'Executes parallel dense vector search (sentence-transformers) and sparse BM25 lexical keyword search across all cataloged criminal statutes.',
    specs: [
      { label: 'Lexical Stream', val: 'BM25Okapi for exact statutory sections (e.g., "Section 103 BNS")' },
      { label: 'Semantic Stream', val: 'Dense embeddings for conceptual meaning & colloquial queries' },
      { label: 'Candidate Pool', val: 'Retrieves top-50 candidate passages from each stream' }
    ],
    techDetails: 'BM25Okapi lexical index (k1=1.5, b=0.75) alongside ChromaDB 384-dimensional cosine vector space, ensuring zero loss of specific numerical section citations.'
  },
  {
    id: 2,
    number: '3',
    title: 'Rank Fusion & Cross-Attention',
    shortName: 'RRF & Reranker',
    icon: Sparkles,
    summary: 'Merges lexical and semantic candidate lists using Reciprocal Rank Fusion (RRF), then performs deep joint query-passage cross-attention to isolate operative provisions.',
    specs: [
      { label: 'Rank Fusion', val: 'Reciprocal Rank Fusion (constant k=60) normalizes different score scales' },
      { label: 'Cross-Encoder', val: 'ms-marco-MiniLM-L-6-v2 evaluates full query-passage interaction' },
      { label: 'Filtration', val: 'Separates substantive operative provisions from index/TOC pages' }
    ],
    techDetails: 'RRF algorithm: R(d) = sum(1 / (60 + rank_i(d))). Cross-encoder jointly encodes [query, passage] through multi-head self-attention layers to compute relevance logits.'
  },
  {
    id: 3,
    number: '4',
    title: 'Window Expansion & Answer Verification',
    shortName: 'Synthesis & Audit',
    icon: Cpu,
    summary: 'Expands contiguous statutory sections (±1 chunk) to capture adjacent provisos and exceptions, then verifies every sentence against retrieved Gazette evidence.',
    specs: [
      { label: 'Context Expansion', val: 'Attaches contiguous chunks to prevent missing statutory exceptions' },
      { label: 'Strict Grounding', val: 'Mandates verbatim quotation and citation of official Gazette sections' },
      { label: 'Abstention Policy', val: 'Abstains if evidence is insufficient or question falls outside corpus' }
    ],
    techDetails: 'Context window expansion (±1 contiguous chunk ID) with Google Gemini Flash legal synthesis prompt, followed by independent regex and metadata citation audit.'
  }
];

const DESIGN_DECISIONS = [
  {
    tag: 'Dual Search',
    title: 'Why use keyword and semantic search together?',
    what: 'Runs sparse BM25 lexical indexing in parallel with dense neural embeddings for every legal query.',
    why: 'Semantic embeddings understand user intent but frequently miss exact section numerals like "Section 103". BM25 guarantees precision on section numbers.',
    benefit: 'Lawyers find exact sections instantly, while lay users get accurate results using plain-language questions.'
  },
  {
    tag: 'Rank Fusion',
    title: 'Why combine results using Reciprocal Rank Fusion?',
    what: 'Merges candidate rankings using position-based harmonic scoring rather than raw similarity scores.',
    why: 'BM25 produces unbounded scores, while vector cosine similarity ranges from -1 to 1. RRF normalizes heterogeneous scales without distortion.',
    benefit: 'The most authoritative statutory sections consistently rank at the top regardless of which search stream found them first.'
  },
  {
    tag: 'Relevance Checking',
    title: 'Why rerank with deep cross-attention?',
    what: 'Feeds the legal query and candidate statutory passage simultaneously into a cross-encoder neural network.',
    why: 'Bi-encoders encode queries and passages separately into single vectors, missing subtle legal nuances and exceptions. Cross-attention reads every word together.',
    benefit: 'Eliminates irrelevant statutory passages and prioritizes operative penal sections over incidental definitions.'
  },
  {
    tag: 'Adjacent Passage Retrieval',
    title: 'Why expand adjacent statutory windows?',
    what: 'Automatically retrieves chunks located immediately before and after the top-ranked statutory section.',
    why: 'In Indian criminal statutes, general rules are often immediately qualified by essential provisos and exceptions in the subsequent paragraph.',
    benefit: 'Prevents incomplete legal answers that cite an offense while missing statutory defenses or exceptions.'
  },
  {
    tag: 'Statutory Verification',
    title: 'Why perform independent citation verification?',
    what: 'Parses every generated answer claim and verifies that cited sections exist in the retrieved Gazette evidence and official index.',
    why: 'Large Language Models are prone to hallucinating plausible-sounding section numbers or confusing old IPC sections with new BNS sections.',
    benefit: 'Guarantees that every cited section number, Gazette page, and statutory name is factually accurate.'
  },
  {
    tag: 'Exception Handling',
    title: 'Why distinguish operative sections from table of contents?',
    what: 'Filters out Gazette preliminary index and table of contents pages using structural heuristic filters.',
    why: 'Index pages frequently match search keywords because they list all sections, but contain no substantive penal law.',
    benefit: 'Ensures the AI synthesizes actual legal text rather than summarizing an index table.'
  }
];

const TECHNICAL_SPECS = [
  {
    category: 'Ingestion & Indexing',
    items: [
      { key: 'Source Documents', value: 'Official Gazette of India enactments for BNS 2023, BNSS 2023, BSA 2023' },
      { key: 'Text Extraction', value: 'PyMuPDF with precise page-boundary and chapter heading tracking' },
      { key: 'Chunk Size / Overlap', value: '500 characters window / 100 characters sliding overlap' },
      { key: 'Lexical Engine', value: 'BM25Okapi with customized legal stopwords and section number tokenization' },
      { key: 'Dense Vector Engine', value: 'ChromaDB persistent vector store with cosine distance metric' }
    ]
  },
  {
    category: 'Retrieval & Reranking',
    items: [
      { key: 'Embedding Model', value: 'sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)' },
      { key: 'RRF Parameter', value: 'k = 60 reciprocal rank fusion smoothing constant' },
      { key: 'Reranker Model', value: 'cross-encoder/ms-marco-MiniLM-L-6-v2 (joint attention scoring)' },
      { key: 'Window Expansion', value: '±1 contiguous chunk offset expansion around operative provisions' },
      { key: 'Top-K Retrieval', value: 'Top 50 lexical + 50 dense candidates fused into top 5 reranked sections' }
    ]
  },
  {
    category: 'Synthesis & Guardrails',
    items: [
      { key: 'Primary LLM', value: 'Google Gemini Flash with temperature=0.1 for high factual fidelity' },
      { key: 'Fallback Architecture', value: 'Extractive statutory synthesis pipeline ensuring high availability' },
      { key: 'Citation Format', value: 'Section [N], [Statute Name] (Gazette Page [P])' },
      { key: 'Abstention Policy', value: 'Explicit refusal on insufficient evidence, non-Indian legal queries, or outdated codes' }
    ]
  }
];

export default function Research() {
  const [viewMode, setViewMode] = useState('flow'); // 'flow' (2D default) | 'isometric' (3D) | 'frontal' (3D tilt)
  const [selectedLayerId, setSelectedLayerId] = useState(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showArchitectureSpecs, setShowArchitectureSpecs] = useState(false);

  // Auto-advance step during simulation
  useEffect(() => {
    let interval;
    if (isSimulating) {
      interval = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev < 3 ? prev + 1 : 0;
          setSelectedLayerId(next);
          if (next === 0 && prev === 3) {
            setIsSimulating(false);
          }
          return next;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const selectedLayer = PIPELINE_STAGES[selectedLayerId];
  const SelectedIcon = selectedLayer.icon;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-[var(--text-primary)] animate-fade-in">
      
      {/* ─── Page Introduction ─────────────────────────────────────── */}
      <div className="mb-6 border-b border-[var(--surface-border)] pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gold-400)] px-2 py-0.5 rounded bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/20">
            Verified RAG Architecture
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Zero Hallucination Policy
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          How LegalRAG Verifies Answers
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
          Indian statutory research demands strict accuracy. LegalRAG rejects ungrounded AI memory, routing every inquiry through a deterministic four-stage retrieval, reranking, and citation-verification pipeline.
        </p>
      </div>

      {/* ─── Grounding Value Explainer Banner ──────────────────────── */}
      <div className="mb-8 p-5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white mb-1">
              Authoritative Grounding Against Official Gazette Enactments
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Generic chatbots confuse repealed British colonial laws (IPC 1860, CrPC 1973) with the new 2023 criminal codes. LegalRAG directly retrieves enacted Gazette provisions, fuses lexical and semantic rankings, and verifies that every legal claim is backed by official statutory text.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Interactive Pipeline Visualization Container ─────────── */}
      <div className="mb-10 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] p-5 sm:p-7 shadow-xl">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-[var(--surface-border)]/60 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--gold-400)] font-bold">
            <span className="flex h-2 w-2 rounded-full bg-[var(--gold-400)] animate-pulse" />
            <span>Pipeline Stage {selectedLayer.number} of 4: {selectedLayer.shortName}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[var(--navy-900)] border border-[var(--surface-border)] p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('flow')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'flow'
                    ? 'bg-[var(--gold-500)] text-[var(--navy-950)] font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2D Flow
              </button>
              <button
                onClick={() => setViewMode('isometric')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'isometric'
                    ? 'bg-[var(--gold-500)] text-[var(--navy-950)] font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Stack
              </button>
              <button
                onClick={() => setViewMode('frontal')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'frontal'
                    ? 'bg-[var(--gold-500)] text-[var(--navy-950)] font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Tilt
              </button>
            </div>

            {/* Simulation Play/Pause Button */}
            <button
              onClick={() => {
                setIsSimulating(!isSimulating);
                if (!isSimulating) setActiveStep(0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--navy-800)] text-[var(--gold-400)] hover:bg-[var(--navy-750)] border border-[var(--gold-400)]/30 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              title="Step-by-step pipeline execution walkthrough"
            >
              {isSimulating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{isSimulating ? 'Pause Trace' : 'Simulate Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* ─── Visualization Display ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Canvas: 2D Flow (Default) or 3D Layered View */}
          <div className="lg:col-span-7 min-w-0 w-full">
            {viewMode === 'flow' ? (
              /* 2D Connected Flow Diagram */
              <div className="space-y-3 py-1">
                {PIPELINE_STAGES.map((layer, index) => {
                  const Icon = layer.icon;
                  const isSelected = selectedLayerId === layer.id;
                  const isPulseActive = isSimulating && activeStep === layer.id;

                  return (
                    <div key={layer.id} className="relative">
                      <div
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-center justify-between ${
                          isSelected
                            ? 'border-[var(--gold-400)] bg-[var(--navy-850)] ring-1 ring-[var(--gold-400)] shadow-md'
                            : 'border-[var(--surface-border)] bg-[var(--surface-primary)] hover:border-slate-500 hover:bg-[var(--surface-elevated)]'
                        } ${isPulseActive ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-xs font-bold ${
                            isSelected 
                              ? 'bg-[var(--gold-500)] text-[var(--navy-950)] border-[var(--gold-400)]' 
                              : 'bg-[var(--navy-950)] text-[var(--gold-400)] border-[var(--surface-border)]'
                          }`}>
                            {layer.number}
                          </div>

                          <div>
                            <span className="text-[10px] font-mono text-[var(--gold-400)] font-bold block uppercase tracking-wider">
                              Stage {layer.number}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-white">
                              {layer.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block bg-[var(--navy-900)] px-2 py-0.5 rounded border border-[var(--surface-border)]">
                            {layer.shortName}
                          </span>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--gold-400)]' : 'text-slate-500'}`}>
                            {isSelected ? 'Active' : 'Inspect'}
                          </span>
                        </div>
                      </div>

                      {/* Connector Arrow */}
                      {index < PIPELINE_STAGES.length - 1 && (
                        <div className="h-2 flex items-center justify-center my-0.5 text-slate-600">
                          <div className="w-0.5 h-2 bg-[var(--surface-border)]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 3D Stack / Tilt Canvas */
              <div className="viewport-3d py-6 flex items-center justify-center min-h-[260px] overflow-hidden">
                <div
                  className={`preserve-3d w-full max-w-sm flex flex-col gap-2.5 transition-all duration-700 ease-out ${
                    viewMode === 'isometric' ? 'isometric-stack' : 'isometric-frontal'
                  }`}
                >
                  {[...PIPELINE_STAGES].reverse().map((layer) => {
                    const Icon = layer.icon;
                    const isSelected = selectedLayerId === layer.id;
                    const isPulseActive = isSimulating && activeStep === layer.id;

                    return (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        style={{
                          transform: `translateZ(${layer.id * 20}px)`
                        }}
                        className={`preserve-3d p-3 sm:p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                          isSelected
                            ? 'border-[var(--gold-400)] bg-[var(--navy-850)] ring-1 ring-[var(--gold-400)] shadow-md scale-[1.02]'
                            : 'border-[var(--surface-border)] bg-[var(--surface-elevated)] hover:border-slate-500'
                        } ${isPulseActive ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--navy-950)] border border-[var(--surface-border)] text-[var(--gold-400)]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-mono text-[var(--gold-400)] font-bold block">
                                Stage {layer.number}
                              </span>
                              <h3 className="text-xs sm:text-sm font-bold text-white">
                                {layer.title}
                              </h3>
                            </div>
                          </div>

                          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                            Select
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Stage Inspection Details Panel */}
          <div className="lg:col-span-5 min-w-0 w-full p-5 rounded-2xl bg-[var(--navy-950)] border border-[var(--surface-border)] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <SelectedIcon className="h-4 w-4 text-[var(--gold-400)]" />
                <h3 className="text-sm font-bold text-white">
                  {selectedLayer.title}
                </h3>
              </div>
              <span className="text-xs font-mono text-[var(--gold-400)] font-bold bg-[var(--gold-500)]/15 px-2 py-0.5 rounded border border-[var(--gold-500)]/30">
                Stage {selectedLayer.number}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {selectedLayer.summary}
            </p>

            {/* Specifications Key-Value List */}
            <div className="space-y-2">
              {selectedLayer.specs.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)] text-xs">
                  <strong className="text-[var(--gold-300)] block font-semibold mb-0.5">
                    {item.label}
                  </strong>
                  <span className="text-slate-300 block leading-snug">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Expandable Technical Details */}
            <div className="pt-2 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="text-[11px] text-[var(--gold-400)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>{showTechDetails ? 'Hide technical implementation' : 'View technical implementation'}</span>
                {showTechDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showTechDetails && (
                <div className="mt-2 p-3 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)] text-[11px] font-mono text-slate-300 leading-relaxed animate-fade-in">
                  {selectedLayer.techDetails}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6 Design Decision Architecture Cards ───────────────────── */}
      <div className="border-t border-[var(--surface-border)] pt-8 mb-10">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gold-400)]">
              Core Engineering Rationale
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Six Critical RAG Design Decisions
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
            Each architectural choice is engineered specifically to eliminate legal hallucinations and uphold statutory integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESIGN_DECISIONS.map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] hover:border-[var(--gold-400)]/30 transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-2.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--gold-500)]/15 text-[var(--gold-300)] border border-[var(--gold-500)]/30">
                  {item.tag}
                </span>
                
                <h3 className="text-sm font-bold text-white leading-snug">
                  {item.title}
                </h3>

                <div className="text-xs space-y-1.5 pt-1">
                  <div>
                    <span className="font-semibold text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                      What it does:
                    </span>
                    <p className="text-slate-300 leading-relaxed">{item.what}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                      Why it is used:
                    </span>
                    <p className="text-slate-300 leading-relaxed">{item.why}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--surface-border)]/60 text-xs">
                <span className="text-[11px] font-mono text-[var(--gold-400)] font-semibold block mb-0.5">
                  User-facing benefit:
                </span>
                <p className="text-slate-300 font-medium leading-snug">
                  {item.benefit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Expandable Technical Architecture Specifications ──────── */}
      <div className="mb-10 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowArchitectureSpecs(!showArchitectureSpecs)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--navy-800)]/50 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Sliders className="h-5 w-5 text-[var(--gold-400)]" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Detailed Technical Specifications & Pipeline Hyperparameters
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Inspect components, embedding dimensions, scoring formulas, and guardrail policies
              </p>
            </div>
          </div>
          {showArchitectureSpecs ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {showArchitectureSpecs && (
          <div className="p-6 border-t border-[var(--surface-border)] bg-[var(--navy-950)] space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TECHNICAL_SPECS.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gold-400)] border-b border-[var(--surface-border)] pb-1.5">
                    {group.category}
                  </h4>
                  <div className="space-y-2 text-xs">
                    {group.items.map((spec, sIdx) => (
                      <div key={sIdx} className="p-2 rounded-lg bg-[var(--navy-900)] border border-[var(--surface-border)]">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                          {spec.key}
                        </span>
                        <span className="text-slate-200 block mt-0.5 leading-snug">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom CTA Action Banner ──────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--surface-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">
            Ready to test statutory research?
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Submit a query in the Workspace and inspect the claim-by-claim verification report.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gold-500)] hover:bg-[var(--gold-400)] text-[var(--navy-950)] font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer shadow-sm"
        >
          <span>Open Legal Workspace</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
