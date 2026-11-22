# 🚀 AURA 3D // AI PDF Chatbot (RAG Engine) with Generative AI

A cutting-edge, production-ready **Generative AI PDF Chatbot** powered by **RAG (Retrieval-Augmented Generation)**, **Python**, **LangChain**, and **Google Gemini**, wrapped in a futuristic **Three.js 3D Interactive UI** with **Exact Page Citations**.

---

## ✨ Key Features

1. 📄 **Intelligent PDF Processing & Page Tracking**:
   - Parses multi-page PDF documents page by page.
   - Chunks text semantically while locking each chunk to its exact page number.
2. 🎯 **Exact Page Citations**:
   - The AI doesn't just answer; it shows glowing citation badges (e.g., `📄 Page 3`, `📄 Page 7`).
   - Click any citation badge or "View PDF" to open the built-in document viewer directly at that page!
3. 🌐 **Interactive 3D Holographic UI (Three.js)**:
   - Dynamic 3D Vector Neural Core with orbiting document cards and over 1,200 particle nodes.
   - Smooth mouse parallax interaction that rotates and responds to cursor movement.
   - Query Pulse: 3D core reacts and shifts into cyber-violet illumination when searching vectors.
4. 🔍 **Source Chunk & Relevance Inspector**:
   - Inspect the exact raw text snippets retrieved from the vector database along with percentage similarity match scores.
5. ⚡ **Lightweight & High Performance**:
   - Powered by FastAPI and an ultra-fast NumPy-based vector similarity search engine, eliminating heavyweight C++ compile bottlenecks on Windows.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn
- **AI & RAG**: Google Gemini 1.5 Flash / Pro, Google Embeddings, LangChain
- **Document Ingestion**: PyPDF
- **Vector Search Engine**: High-dimensional Cosine Similarity Vector Index
- **Frontend**: HTML5, Tailwind CSS, Three.js, Marked.js, Glassmorphism UI

---

## 📋 Installation & Setup Guide

### 1. Open Terminal & Go to the Project Directory
```powershell
cd "C:\Users\HP\.gemini\antigravity\scratch\ai-pdf-chatbot-3d"
```

### 2. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Your API Key
Open `.env` file in the project folder and paste your free Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
> 💡 *Don't have a Gemini API key yet? Get one 100% free at: [Google AI Studio](https://aistudio.google.com/app/apikey)*

### 5. Run the Application
```powershell
python main.py
```
Or with Uvicorn directly:
```powershell
uvicorn app.api:app --reload --port 8000
```

### 6. Open in Browser
Visit: **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Project Directory Structure

```
ai-pdf-chatbot-3d/
├── .env                  # API keys and model configuration
├── .env.example          # Environment variables template
├── requirements.txt      # Python dependencies
├── README.md             # Project documentation
├── main.py               # Application entry point
├── uploads/              # Stored uploaded PDFs
├── app/
│   ├── __init__.py
│   ├── config.py         # App configurations
│   ├── api.py            # FastAPI REST endpoints
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── pdf_processor.py  # Page-by-page text extractor & chunker
│   │   ├── vector_store.py   # Vector embeddings & similarity search
│   │   └── rag_engine.py     # Gemini RAG pipeline & page citations
│   └── static/
│       ├── index.html        # Futuristic UI
│       ├── css/
│       │   └── style.css     # Glassmorphism & neon glows
│       └── js/
│           ├── three_scene.js # Three.js 3D Neural Hologram Core
│           └── app.js        # Chat logic, upload & citation interactions
```
