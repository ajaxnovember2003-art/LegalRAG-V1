# LegalRAG Frontend

A modern, evidence-grounded research interface for the **LegalRAG** Indian Legal Question Answering System.

Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, **React Router v7**, **Lucide Icons**, and **Axios**.

---

## 🌟 Key Features

- **Genuine Backend Connection**: Direct integration with the LegalRAG FastAPI backend (`/api/query`, `/api/health`).
- **Verifiable Statutory Provenance**: Displays real retrieved passages from the **Bharatiya Nyaya Sanhita (BNS 2023)**, **Bharatiya Nagarik Suraksha Sanhita (BNSS 2023)**, and **Bharatiya Sakshya Adhiniyam (BSA 2023)** with exact chunk IDs, page numbers, and cross-encoder scores.
- **Pipeline Architecture & Trace**: Interactive visual trace displaying the 5 deterministic pipeline stages:
  1. *Hybrid Retrieval* (Dense Semantic + Lexical BM25)
  2. *RRF Fusion* (Reciprocal Rank Fusion, $k=60$)
  3. *Cross-Encoder Reranking* (`ms-marco-MiniLM-L-6-v2`)
  4. *Context Expansion* (Window $\pm 1$)
  5. *Gemini LLM Generation* (`gemini-3.6-flash`)
- **Document & Passage Inspector**: Modal dialog to inspect full statutory passages, search within excerpts, and copy citations.
- **Technical Viva Dossier**: Dedicated `/research` page with technical justifications (Hybrid vs Dense, RRF vs Weighted Sum, Cross-Encoder vs Bi-Encoder).
- **Statutory Knowledge Base**: Dedicated `/statutes` page summarizing BNS, BNSS, and BSA codifications and sample queries.
- **Offline & Health Resilience**: Automatic periodic health checks against the backend, clear error messaging with startup instructions, and zero-crash fallbacks.
- **Local History**: Persistent recent query history saved in `localStorage`.

---

## 🚀 Quick Start

### 1. Start the Backend API

From the root project directory:

```bash
# Ensure Python virtual environment is activated
python -m src.api
```

The API will listen at `http://localhost:8000`. Test health status at `http://localhost:8000/api/health`.

### 2. Start the Frontend

From the `frontend/` directory:

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## ⚙️ Configuration (.env)

Create a `.env` or `.env.local` inside the `frontend/` folder:

```env
# Backend API Base URL (empty string uses Vite proxy in development)
VITE_API_BASE_URL=http://localhost:8000

# Set to true only for offline demonstration without LLM API keys
VITE_DEMO_MODE=false
```

---

## 🏗️ Project Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── AnswerCard.jsx        # AI answer with structured sections & metadata
│   │   ├── CitationBadge.jsx     # Clickable statute reference pill
│   │   ├── DocumentViewer.jsx    # Full-screen modal for statutory passage inspection
│   │   ├── EmptyState.jsx        # First-load architecture overview & pillars
│   │   ├── ErrorState.jsx        # Graceful error handling with startup commands
│   │   ├── EvidencePanel.jsx     # Statute distribution & citation overview
│   │   ├── LoadingState.jsx      # Pipeline stage progress animation & shimmers
│   │   ├── Navbar.jsx            # Sticky branding, routes, API status indicator
│   │   ├── QuerySuggestions.jsx  # Clickable sample Indian legal questions
│   │   ├── RetrievalTrace.jsx    # Multi-stage RAG pipeline visualization
│   │   ├── SearchBar.jsx         # Input box with keyboard shortcuts & loading state
│   │   ├── Sidebar.jsx           # Recent query history & codified acts overview
│   │   └── SourceCard.jsx        # Individual statutory passage card with scores
│   ├── hooks/
│   │   └── useLegalRAG.js        # Core query lifecycle, health checking, history
│   ├── pages/
│   │   ├── Document.jsx          # Indexed Acts (BNS, BNSS, BSA) explorer
│   │   ├── Home.jsx              # Main research workspace
│   │   └── Research.jsx          # Pipeline architecture & Technical Viva dossier
│   ├── services/
│   │   └── api.js                # Centralized Axios client & API methods
│   ├── utils/
│   │   └── formatters.js         # Act name mapping, page ranges, score formatting
│   ├── App.jsx                   # Layout shell, global routing, state coordination
│   ├── index.css                 # Custom design tokens, navy/gold theme, animations
│   └── main.jsx                  # Application entry point
├── package.json
└── vite.config.js
```

---

## 📦 Building for Production

```bash
npm run build
```

The production assets will be built in `frontend/dist/`.

---

## 🎓 Academic Viva & Presentation Notes

When presenting this project:
1. **Highlight Grounding**: Note that LegalRAG does not extrapolate or generate ungrounded opinions; all answers are anchored to indexed statutory chunks.
2. **Showcase Hybrid Retrieval**: Explain why Indian section numbers require BM25 lexical precision while queries require dense semantic embeddings.
3. **Point to Cross-Encoder Scores**: Demonstrate how the cross-encoder computes full query-passage attention, sorting the top passages before passing to the generator.
