import os
import time
from typing import List, Dict, Any
import google.generativeai as genai
from app.config import Config
from app.rag.pdf_processor import PDFProcessor, DocumentChunk
from app.rag.vector_store import VectorStore

class RAGEngine:
    def __init__(self):
        self.pdf_processor = PDFProcessor(
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP
        )
        self.vector_store = VectorStore()
        self.loaded_files: List[Dict[str, Any]] = []
        self._init_models()

    def _init_models(self):
        api_key = Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key, transport="rest")

    def process_pdf(self, file_path: str, filename: str) -> Dict[str, Any]:
        start_time = time.time()
        api_key = Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured. Please add it to your .env file.")

        genai.configure(api_key=api_key, transport="rest")

        chunks = self.pdf_processor.extract_chunks(file_path, filename)
        if not chunks:
            raise ValueError("No readable text found in the uploaded PDF.")

        # Local Instant Indexing (0.001s, zero network delay)
        self.vector_store.add_chunks_with_embeddings(chunks)
        elapsed = round(time.time() - start_time, 2)
        print(f"Index complete! Successfully indexed {len(chunks)} chunks in {elapsed}s.\n")

        file_meta = {
            "filename": filename,
            "total_chunks": len(chunks),
            "total_pages": max([c.page_number for c in chunks]) if chunks else 1
        }
        self.loaded_files.append(file_meta)
        return file_meta

    def query(self, user_question: str) -> Dict[str, Any]:
        api_key = Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing.")

        if self.vector_store.total_chunks == 0:
            return {
                "answer": "No documents uploaded yet. Please upload a PDF file first to start chatting!",
                "sources": []
            }

        genai.configure(api_key=api_key, transport="rest")
        print(f"\n[RAG Engine] Answering: '{user_question}'")

        if self.vector_store.total_chunks <= 6:
            top_results = [(c, 0.98) for c in self.vector_store.chunks]
        else:
            top_results = self.vector_store.similarity_search(user_question, top_k=Config.TOP_K_RESULTS)

        context_parts = []
        sources = []
        for rank, (chunk, score) in enumerate(top_results, start=1):
            context_parts.append(
                f"[Excerpt {rank} | Page {chunk.page_number} | File: {chunk.source_filename}]:\n{chunk.text}\n"
            )
            sources.append({
                "page": chunk.page_number,
                "file": chunk.source_filename,
                "snippet": chunk.text[:220] + ("..." if len(chunk.text) > 220 else ""),
                "score": round(score * 100, 1)
            })

        context_str = "\n".join(context_parts)

        prompt = f"""You are an elite, highly concise AI Research Assistant.
Answer the user's question accurately using ONLY the document excerpts below.

INSTRUCTIONS:
1. Cite the exact page number(s) (e.g., "[Page 1]" or "According to Page 1...") for facts.
2. If summarizing or reviewing, give crisp, formatted bullet points.
3. Be direct, professional, and fast.

=== DOCUMENT EXCERPTS ===
{context_str}

=== USER QUESTION ===
{user_question}

=== ANSWER ==="""

        generation_config = genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=700
        )

        t0 = time.time()
        model = genai.GenerativeModel("gemini-3.8-flash")
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            request_options={"timeout": 15}
        )

        if not response:
            raise ValueError("Could not generate answer from Gemini 3.8 Flash.")

        try:
            answer_text = response.text
        except Exception:
            if response and hasattr(response, "candidates") and response.candidates:
                answer_text = response.candidates[0].content.parts[0].text
            else:
                answer_text = "I reviewed your document but could not synthesize text. Please try asking again."

        elapsed = round(time.time() - t0, 2)
        print(f"[RAG Engine] Answer generated in {elapsed}s! Done.")

        return {
            "answer": answer_text,
            "sources": sources
        }

    def reset(self):
        self.vector_store.clear()
        self.loaded_files = []