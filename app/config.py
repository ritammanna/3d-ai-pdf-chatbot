import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    # Official active Google model
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
    
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))
    TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", 4))
    
    UPLOAD_DIR = BASE_DIR / "uploads"
    STATIC_DIR = BASE_DIR / "app" / "static"

os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

def resolve_model_name(preferred=None) -> str:
    return Config.GEMINI_MODEL or preferred or "gemini-3.8-flash"

def resolve_embedding_model(preferred=None) -> str:
    return Config.EMBEDDING_MODEL or preferred or "models/text-embedding-004"
