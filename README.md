# Yggdrasil AI 🌳

Yggdrasil AI is a modern, full-stack smart AI chat application featuring a sleek React frontend and a powerful FastAPI backend, powered by state-of-the-art LLM of Azure Foundry.

## 🚀 Features

### 🧠 Advanced Backend Engineering
- **2-Stage Semantic Caching Engine**: 
  - Utilizes **Redis (RediSearch)** as a high-performance vector database.
  - Implements a sophisticated 2-stage reranking pipeline: 
    - **Stage 1**: Dense Vector Search using Cosine Similarity for semantic matching.
    - **Stage 2**: BM25 Lexical Reranking (`rank_bm25`) for keyword precision.
  - Drastically reduces LLM latency and API costs by serving high-confidence cached responses.
- **Comprehensive Telemetry & Metrics Dashboard**: 
  - Real-time tracking of Time to First Token (TTFT), overall Generation Time, and granular latency metrics (Redis lookups, BM25 reranking).
  - Built-in cost estimation and token usage monitoring (Input/Output).
  - Tracks Cache Hit Rates and system failures for reliability monitoring.
- **Extensible LLM Provider (Azure & Standard OpenAI)**: 
  - Asynchronous streaming architecture (`AsyncOpenAI`) for fluid user experiences.
  - Native integration with advanced tools: Web Search, File Search/RAG, and **Model Context Protocol (MCP)** integration (e.g., GitHub server) for agentic capabilities.
- **Native RAG & File Management**: 
  - Supports uploading a wide variety of document types for Retrieval-Augmented Generation.
  - Seamless integration with OpenAI's Assistant API Vector Stores.
- **High-Performance Architecture**: Built on top of FastAPI and SQLAlchemy (PostgreSQL/SQLite) with background task offloading.

### 🎨 Frontend UI/UX
- **Modern Interface**: A clean, responsive frontend built with React and Vite.

## Consideration
Rather than using OpenAI's Response API for remembering context, I use traditional way to store previous messages, i.e., database.

## Accepted file types
.art, .bat, .brf, .c, .cls, .css, .csv, .diff, .doc, .docx, .dot, .eml, .es, .h, .hs, .htm, .html, .hwp, .hwpx, .ics, .ifb, .java, .js, .json, .keynote, .ksh, .ltx, .mail, .markdown, .md, .mht, .mhtml, .mjs, .nws, .odt, .pages, .patch, .pdf, .pl, .pm, .pot, .ppa, .pps, .ppt, .pptx, .pwz, .py, .rst, .rtf, .scala, .sh, .shtml, .srt, .sty, .svg, .svgz, .tex, .text, .txt, .tsv, .vcf, .vtt, .wiz, .xla, .xlb, .xlc, .xlm, .xls, .xlsx, .xlt, .xlw, .xml, .yaml, .yml

Images: .png, .jpg, .jpeg, .webp, .gif


**Pros of response API:**

- Less code.
- OpenAI manages conversation history.
- Easier to build a chatbot quickly.

**Cons**

- Ties us heavily into the OpenAI ecosystem, relying on OpenAI's specific server-side memory system.
- Current LLMProvider setup is very flexible, I could easily swap out OpenAI for Anthropic, Gemini, or a local model.
- With response API, we'll need to redesign how conversation memory works. 
- Less control over exactly what context is retained and how it's managed.

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Context API (Auth & State Management)

**Backend:**
- Python 3.x
- FastAPI
- SQLAlchemy (PostgreSQL / SQLite)
- Uvicorn (ASGI server)

## ⚙️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/AanshOjha/Yggdrasil-AI.git
cd Yggdrasil-AI
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment:
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate

# Install dependencies (assuming you have a requirements.txt)
pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend/` directory and configure your secrets.
```env
# Example backend/.env
AZURE_ENDPOINT=
AZURE_TOKEN_PROVIDER=
DEPLOYMENT_NAME=
SECRET_KEY=
DATABASE_URL=
```

**Start the PostgreSQL Database (Docker):**
We provide a `docker-compose.yml` to easily spin up a PostgreSQL instance.
```bash
cd backend
docker-compose up -d
```
This starts PostgreSQL on port `5432` (User: `yggdrasil`, Password: `password123`, DB: `yggdrasil`).
*Note: Make sure to set `DATABASE_URL=postgresql://yggdrasil:password123@localhost:5432/yggdrasil` in your `.env`.*


**Start the Backend Server:**
```bash
cd backend
uvicorn app.main:app --reload
```
The backend will be running at `http://localhost:8000`. You can view the interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory:
```bash
cd frontend

# Install dependencies
npm install
```

**Start the Frontend Development Server:**
```bash
npm run dev
```
The frontend will typically be running at `http://localhost:5173`. Open this URL in your browser to start using Yggdrasil AI!

It assumes backend is running at `http://localhost:8000`

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AanshOjha/Yggdrasil-AI/issues).

## 📄 License
This project is licensed under the MIT License.
