# ⚖️ Legal RAG

## Evidence-Grounded Legal Question Answering System

**Legal RAG** is a Retrieval-Augmented Generation (RAG) system designed for **Indian legal document analysis and question answering**.

The system combines **semantic retrieval, BM25 lexical search, Reciprocal Rank Fusion (RRF), cross-encoder reranking, context expansion, and Google Gemini** to generate answers grounded in retrieved legal documents.

The current knowledge base focuses on:

* Bharatiya Nyaya Sanhita (BNS), 2023
* Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023
* Bharatiya Sakshya Adhiniyam (BSA), 2023

> **Retrieve first. Generate second.**

---

## 🎯 Project Objective

Large Language Models can generate fluent responses but may sometimes produce information that is unsupported by the source documents.

Legal RAG addresses this problem by retrieving relevant passages from a controlled collection of Indian legal documents and providing those passages to the language model as evidence.

The system is designed to:

* Retrieve relevant legal provisions
* Combine semantic and keyword-based search
* Improve retrieval using reranking
* Provide surrounding legal context
* Generate evidence-grounded answers
* Identify the source of the retrieved information
* Reduce unsupported or hallucinated responses

The basic workflow is:

```text
User Question
      ↓
Retrieve Relevant Evidence
      ↓
Rank and Filter Evidence
      ↓
Expand Context
      ↓
Generate Answer
      ↓
Provide Sources
```

---

# 🧠 System Architecture

```text
                    LEGAL DOCUMENTS
                   BNS / BNSS / BSA
                          │
                          ▼
                 PDF Text Extraction
                          │
                          ▼
                    Text Cleaning
                          │
                          ▼
                 Document Chunking
                          │
                          ▼
                 Sentence Embeddings
                          │
                          ▼
                      ChromaDB
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      Semantic Retrieval         BM25 Retrieval
              │                       │
              └───────────┬───────────┘
                          ▼
                    RRF Fusion
                     Top 50
                          │
                          ▼
                 Cross-Encoder
                   Reranking
                     Top 5
                          │
                          ▼
                 Context Expansion
                          │
                          ▼
                     Gemini LLM
                          │
                          ▼
              Grounded Legal Answer
                          │
                          ▼
                  Evidence + Sources
```

---

# 🔎 Retrieval Pipeline

Legal RAG uses a **multi-stage hybrid retrieval pipeline**.

## 1. Semantic Retrieval

Legal document chunks are converted into vector embeddings using:

```text
all-MiniLM-L6-v2
```

The embeddings are stored in **ChromaDB** and used to retrieve documents based on semantic similarity.

This allows the system to find relevant passages even when the wording of the user's question does not exactly match the wording in the legal document.

---

## 2. BM25 Lexical Retrieval

A BM25-based retriever performs keyword-based searching over the legal corpus.

This is useful for legal queries containing specific terms such as:

```text
Section 35
arrest without warrant
bail
electronic record
attempt to murder
```

BM25 complements semantic retrieval by ensuring that important legal terminology and exact phrases are not overlooked.

---

## 3. Reciprocal Rank Fusion (RRF)

The results from semantic retrieval and BM25 retrieval are combined using:

```text
Reciprocal Rank Fusion (RRF)
```

The current pipeline produces:

```text
Top 50 candidate chunks
```

These candidates are then passed to the reranking stage.

---

## 4. Cross-Encoder Reranking

The retrieved candidates are reranked using:

```text
cross-encoder/ms-marco-MiniLM-L-6-v2
```

The reranker evaluates the relationship between the user's question and each retrieved passage.

The system then selects:

```text
Top 5 evidence chunks
```

for the generation stage.

---

## 5. Context Expansion

Legal information can depend on surrounding sections or paragraphs.

Therefore, the system expands the selected evidence by retrieving neighboring chunks around the highest-ranked result.

This provides the language model with additional context instead of relying on an isolated passage.

---

## 6. Grounded Generation

The retrieved evidence is supplied to **Google Gemini**.

The generation process is designed to:

* Use the supplied evidence
* Avoid unsupported claims
* Distinguish legal information from inference
* Reference the retrieved document sources
* State when sufficient evidence is not available

This creates an evidence-grounded answer rather than a response based only on the model's general knowledge.

---

# 📚 Legal Knowledge Base

The current knowledge base contains the following major legal documents:

| Document                                        | Purpose                  |
| ----------------------------------------------- | ------------------------ |
| Bharatiya Nyaya Sanhita (BNS), 2023             | Substantive criminal law |
| Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 | Criminal procedure       |
| Bharatiya Sakshya Adhiniyam (BSA), 2023         | Law of evidence          |

The current processed corpus contains approximately:

```text
1,000 chunks
```

Generated processed files and the local ChromaDB database are excluded from Git and can be regenerated locally.

---

# 🧪 Example

### User Question

```text
What is the charge for attempt to murder?
```

### Response Structure

```text
ANSWER
...

LAW SAYS
...

CASE DOCUMENT SAYS
...

INFERENCE
...

SOURCES
...
```

The system retrieves relevant legal provisions and uses the retrieved evidence to construct the response.

---

# 🛠️ Technology Stack

## Programming

* Python 3.12

## Document Processing

* PyMuPDF

## Embeddings

* Sentence Transformers
* `all-MiniLM-L6-v2`

## Vector Database

* ChromaDB

## Retrieval

* Semantic Search
* BM25
* Reciprocal Rank Fusion (RRF)

## Reranking

* Cross-Encoder
* `cross-encoder/ms-marco-MiniLM-L-6-v2`

## Generation

* Google Gemini
* Gemini API

## Environment

* Conda
* Python 3.12

---

# 📁 Project Structure

```text
legal-rag-system/
│
├── data/
│   └── documents/
│       ├── BNS2023.pdf
│       ├── BNSS.pdf
│       └── BSA.pdf
│
├── src/
│   ├── __init__.py
│   ├── cleaner.py
│   ├── chunker.py
│   ├── embedder.py
│   ├── indexer.py
│   ├── ingest.py
│   ├── retriever.py
│   ├── hybrid_retrieve.py
│   ├── reranker.py
│   ├── context_builder.py
│   ├── generator.py
│   ├── pipeline.py
│   ├── retrieve.py
│   ├── search.py
│   ├── evaluate_retrieval.py
│   └── evaluate_reranking.py
│
├── data/
│   └── processed/
│
├── chroma_db/
│
├── requirements.txt
├── .gitignore
└── README.md
```

> File names may vary depending on the current implementation of the project.

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd legal-rag-system
```

## 2. Create the Conda Environment

```bash
conda create -n ai-lab python=3.12
conda activate ai-lab
```

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

# 🔑 Gemini API Key

Legal RAG uses a Gemini API key for answer generation.

### Linux / macOS

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
```

### Windows PowerShell

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY"
```

Verify that the key is available:

```bash
python -c "import os; print(bool(os.getenv('GEMINI_API_KEY')))"
```

**Never commit your API key to GitHub.**

Use a `.env` file or environment variable and make sure it is included in `.gitignore`.

---

# ▶️ Running the Project

## Option A — Web Application (FastAPI + React Frontend)

### 1. Launch the Backend API

From the root project directory:

```bash
python -m src.api
```
The FastAPI server will start on `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

### 2. Launch the React Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser for the full evidence-grounded legal research UI with pipeline trace and statutory inspection.

---

## Option B — Terminal / CLI Interface

Start the command-line RAG pipeline directly:

```bash
python -m src.pipeline
```

The application will prompt for a legal question:

```text
Ask Legal RAG (type 'exit' to quit):
```

Enter a question and the system will execute:

```text
Question
   ↓
Semantic Retrieval + BM25 Retrieval
   ↓
RRF Fusion
   ↓
Cross-Encoder Reranking
   ↓
Context Expansion
   ↓
Gemini
   ↓
Grounded Answer
```

---

# 📊 Pipeline Validation

The complete RAG pipeline has been tested through the following stages:

```text
PDF Documents
      ↓
Text Extraction
      ↓
Cleaning
      ↓
Chunking
      ↓
Embedding
      ↓
Vector Index
      ↓
Semantic Retrieval
      ↓
BM25 Retrieval
      ↓
RRF Fusion
      ↓
Cross-Encoder Reranking
      ↓
Context Expansion
      ↓
Gemini Generation
      ↓
Grounded Legal Response
```

The retrieval pipeline has been tested with legal questions involving areas such as arrest procedures and criminal law provisions.

---

# 🚧 Current Limitations

Legal RAG is currently an **academic/research prototype**.

Current limitations include:

* The knowledge base is currently limited to selected Indian legal documents.
* Case-specific document ingestion is still under development.
* The current reranker is a general-purpose passage-ranking model.
* Context expansion is currently focused on the highest-ranked retrieval result.
* Retrieval evaluation can be improved using a larger manually verified benchmark.
* Legal information should always be verified against the latest authoritative source before real-world use.

---

# 🔮 Future Enhancements

## 📄 Case Document Analysis

Future versions can support documents such as:

```text
FIRs
Complaints
Charge Sheets
Court Orders
Judgments
Witness Statements
Police Reports
Contracts
Evidence Documents
```

---

## ⚖️ Legal Knowledge Expansion

The knowledge base can be extended to include:

```text
Constitution of India
Central Acts
State Acts
Rules and Regulations
Court Judgments
Legal Commentaries
```

---

## 🧠 Improved Legal Retrieval

Possible improvements include:

* Legal-domain embedding models
* Legal-specific rerankers
* Section-aware retrieval
* Citation-aware retrieval
* Metadata filtering
* Document versioning
* Better chunking strategies
* Retrieval evaluation benchmarks

## 🖥️ Modern Web Interface & Features

LegalRAG includes a full-featured, responsive React 19 + Tailwind CSS web application:

* **Evidence-Grounded Legal Workspace**: Natural-language statutory queries, enter-to-submit, instant query chips, and active retrieval traces.
* **Structured Grounded Synthesis**: Divided into Executive Summary, Statutory Provisions (Law Says), Legal Analysis & Elements, Exceptions & Provisos, and Limitations & Uncertainties.
* **Citation & Grounding Verification Engine**: Multi-step verification assessing statutory existence, section confirmation, evidence containment, and Gazette version validity.
* **950+ Statutory Sections Explorer**: Real-time keyword and section-number search across official Gazette chunks for BNS, BNSS, and BSA 2023.
* **Historical Concordance & Transition Tables**: Side-by-side comparison between colonial statutes (IPC, CrPC, IEA) and enacted 2023 Sanhitas with correspondence classifications.
* **Passage & Document Inspector**: Modal dialog to inspect verbatim Gazette passages, highlight keywords, and copy official citations.
* **Persistent Research History & Bookmarks**: Local history with timestamps, confirmation-based deletion, and session bookmarking.
* **Interactive Pipeline Visualizer**: 3D Stack, 3D Tilt, and 2D Flow architectural modes explaining each RAG retrieval stage.

---

## 🚀 Running the System

### 1. Start the Backend API (FastAPI)

```bash
# Activate your conda / virtual environment (with dependencies installed)
conda activate ai-lab

# Start FastAPI server on port 8000
python -m src.api
```

The API will be available at `http://localhost:8000`. Test health status at `http://localhost:8000/api/health`.

### 2. Start the Frontend (Vite + React)

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server on port 5173
npm run dev
```

Open `http://localhost:5173` in your browser.


# ⚖️ Disclaimer

Legal RAG is an **academic/research project** intended for experimentation with legal information retrieval and evidence-grounded question answering.

It is **not a substitute for professional legal advice, legal representation, or judicial determination**.

Users should independently verify legal information using authoritative and current legal sources before relying on it for real-world decisions.

---

# 👨‍💻 Author

## Abhijith Arun

**B.Tech — Artificial Intelligence and Data Science**

Vimal Jyothi Engineering College

### GitHub

`github.com/ajaxnovember2003-art`

### LinkedIn

`linkedin.com/in/abhijitharun/`

---

# 📄 License

License information will be added in a future version.

---

## ⭐ Project

**Legal RAG — Evidence-Grounded Legal Question Answering System**

Built as an academic AI/ML project exploring:

```text
Retrieval-Augmented Generation
        +
Hybrid Information Retrieval
        +
Legal Document Processing
        +
LLM Grounding
        +
Evidence-Based Question Answering
```
