import os
import shutil
import asyncio
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.config import Config
from app.rag.rag_engine import RAGEngine

app = FastAPI(title="AI PDF Chatbot 3D", version="1.0.0")

app.mount("/static", StaticFiles(directory=str(Config.STATIC_DIR)), name="static")

rag_engine = RAGEngine()

class QueryRequest(BaseModel):
    question: str

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = Config.STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(content=index_file.read_text(encoding="utf-8"))

@app.get("/api/status")
async def get_status():
    api_key_set = bool(Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY"))
    return {
        "status": "ready" if api_key_set else "needs_api_key",
        "api_key_configured": api_key_set,
        "loaded_files": rag_engine.loaded_files,
        "total_chunks": rag_engine.vector_store.total_chunks,
        "model": Config.GEMINI_MODEL
    }

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_path = Config.UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        meta = await asyncio.to_thread(rag_engine.process_pdf, str(file_path), file.filename)
        return {
            "success": True,
            "filename": file.filename,
            "total_chunks": meta["total_chunks"],
            "total_pages": meta["total_pages"],
            "message": f"Successfully indexed {meta['total_chunks']} chunks from {file.filename} across {meta['total_pages']} pages."
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(req: QueryRequest):
    print(f"\n[API /chat] Received question: '{req.question}'")
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    try:
        response = await asyncio.to_thread(rag_engine.query, req.question)
        print("[API /chat] Successfully returned response to browser!")
        return response
    except Exception as e:
        print(f"[API /chat ERROR]: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset_knowledge():
    rag_engine.reset()
    return {"success": True, "message": "Knowledge base reset successfully."}

@app.get("/api/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = Config.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(file_path, media_type="application/pdf")
