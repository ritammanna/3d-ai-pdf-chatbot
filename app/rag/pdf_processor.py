import os
import re
import time
from dataclasses import dataclass
from typing import List
from pypdf import PdfReader

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        class RecursiveCharacterTextSplitter:
            def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, separators: List[str] = None):
                self.chunk_size = chunk_size
                self.chunk_overlap = chunk_overlap
                self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

            def split_text(self, text: str) -> List[str]:
                if not text:
                    return []
                chunks = []
                start = 0
                text_len = len(text)
                while start < text_len:
                    end = min(start + self.chunk_size, text_len)
                    if end < text_len:
                        split_pos = -1
                        for sep in self.separators:
                            if not sep:
                                continue
                            pos = text.rfind(sep, start, end)
                            if pos > start:
                                split_pos = pos + len(sep)
                                break
                        if split_pos != -1:
                            end = split_pos
                    chunk = text[start:end].strip()
                    if chunk:
                        chunks.append(chunk)
                    if end >= text_len:
                        break
                    start = max(end - self.chunk_overlap, start + 1)
                return chunks

@dataclass
class DocumentChunk:
    chunk_id: str
    text: str
    page_number: int
    source_filename: str
    chunk_index: int

class PDFProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def extract_chunks(self, file_path: str, filename: str) -> List[DocumentChunk]:
        t0 = time.time()
        print(f"\n[1/2] Reading PDF structure: {filename}")
        reader = PdfReader(file_path)
        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        total_pages = len(reader.pages)
        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = reader.pages[page_idx]
            page_text = page.extract_text() or ""
            page_text = page_text.strip()
            
            if not page_text:
                continue

            page_chunks = self.splitter.split_text(page_text)
            for sub_idx, chunk_text in enumerate(page_chunks):
                chunk_id = f"{filename}_p{page_num}_c{sub_idx}"
                chunks.append(
                    DocumentChunk(
                        chunk_id=chunk_id,
                        text=chunk_text,
                        page_number=page_num,
                        source_filename=filename,
                        chunk_index=global_chunk_idx
                    )
                )
                global_chunk_idx += 1

        if chunks:
            print(f"Extracted {len(chunks)} chunks instantly via native PDF parser ({round(time.time() - t0, 2)}s).")
            return chunks

        # Fallback for Scanned / Image-based PDFs (e.g. Canva CV)
        print(f"[2/2] No selectable text found. Invoking Gemini 3.8 Flash Vision OCR...")
        chunks = self._extract_with_gemini_vision(file_path, filename)
        return chunks

    def _extract_with_gemini_vision(self, file_path: str, filename: str) -> List[DocumentChunk]:
        import google.generativeai as genai
        from app.config import Config

        api_key = Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in .env file.")

        genai.configure(api_key=api_key, transport="rest")

        with open(file_path, "rb") as f:
            pdf_data = f.read()

        prompt = """Extract all readable text, contact details, skills, experience, projects, and education from this document.
Format pages as:
=== PAGE 1 ===
<full text of page 1>"""

        pdf_part = {
            "mime_type": "application/pdf",
            "data": pdf_data
        }

        # Active Google model: gemini-3.8-flash
        model_name = "gemini-3.8-flash"
        print(f"Attempting Vision OCR with model: {model_name}...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content([pdf_part, prompt])

        if not response or not response.text:
            raise ValueError("Vision OCR returned empty response. Please verify the PDF.")

        full_text = response.text
        print(f"Vision OCR successfully extracted {len(full_text)} characters!")

        page_pattern = re.compile(r'===\s*PAGE\s*(\d+)\s*===', re.IGNORECASE)
        splits = page_pattern.split(full_text)

        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        if len(splits) > 1:
            for i in range(1, len(splits), 2):
                p_num = int(splits[i])
                p_text = splits[i+1].strip()
                if not p_text:
                    continue
                p_chunks = self.splitter.split_text(p_text)
                for sub_idx, c_text in enumerate(p_chunks):
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{filename}_ocr_p{p_num}_c{sub_idx}",
                            text=c_text,
                            page_number=p_num,
                            source_filename=filename,
                            chunk_index=global_chunk_idx
                        )
                    )
                    global_chunk_idx += 1
        else:
            if full_text.strip():
                p_chunks = self.splitter.split_text(full_text.strip())
                for sub_idx, c_text in enumerate(p_chunks):
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{filename}_ocr_p1_c{sub_idx}",
                            text=c_text,
                            page_number=1,
                            source_filename=filename,
                            chunk_index=global_chunk_idx
                        )
                    )
                    global_chunk_idx += 1

        return chunks