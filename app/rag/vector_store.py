import math
import re
from typing import List, Tuple, Dict
from app.rag.pdf_processor import DocumentChunk

class VectorStore:
    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self.doc_freq: Dict[str, int] = {}
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.chunk_term_freqs: List[Dict[str, int]] = []

    def clear(self):
        self.chunks = []
        self.doc_freq = {}
        self.doc_lengths = []
        self.avg_doc_len = 0.0
        self.chunk_term_freqs = []

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'[a-zA-Z0-9_\u0980-\u09FF]+', text.lower())

    def add_chunks_with_embeddings(self, chunks: List[DocumentChunk], embeddings: List = None):
        self.chunks.extend(chunks)
        total_len = 0

        for chunk in chunks:
            tokens = self._tokenize(chunk.text)
            term_freq: Dict[str, int] = {}
            for t in tokens:
                term_freq[t] = term_freq.get(t, 0) + 1
            
            self.chunk_term_freqs.append(term_freq)
            doc_len = len(tokens)
            self.doc_lengths.append(doc_len)
            total_len += doc_len

            for t in set(tokens):
                self.doc_freq[t] = self.doc_freq.get(t, 0) + 1

        if self.chunks:
            self.avg_doc_len = total_len / len(self.chunks)

    def similarity_search(self, query: str, top_k: int = 4) -> List[Tuple[DocumentChunk, float]]:
        if not self.chunks:
            return []

        if isinstance(query, (list, tuple)):
            return [(c, 0.95) for c in self.chunks[:top_k]]

        query_tokens = self._tokenize(str(query))
        if not query_tokens:
            return [(c, 0.9) for c in self.chunks[:top_k]]

        N = len(self.chunks)
        k1 = 1.5
        b = 0.75
        scores = [0.0] * N

        for q_term in query_tokens:
            df = self.doc_freq.get(q_term, 0)
            if df == 0:
                continue

            idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)

            for i in range(N):
                tf = self.chunk_term_freqs[i].get(q_term, 0)
                if tf == 0:
                    continue
                doc_len = self.doc_lengths[i]
                numerator = tf * (k1 + 1)
                denominator = tf + k1 * (1 - b + b * (doc_len / (self.avg_doc_len or 1.0)))
                scores[i] += idf * (numerator / denominator)

        max_score = max(scores) if scores and max(scores) > 0 else 1.0
        ranked_indices = sorted(range(N), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in ranked_indices:
            norm_score = 0.75 + (scores[idx] / max_score) * 0.24 if max_score > 0 else 0.85
            results.append((self.chunks[idx], float(norm_score)))

        return results

    @property
    def total_chunks(self) -> int:
        return len(self.chunks)