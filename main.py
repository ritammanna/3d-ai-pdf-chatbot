import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting AI PDF Chatbot 3D server on http://localhost:{port}")
    # reload=False ensures maximum stability on Windows without random subprocess shutdowns
    uvicorn.run("app.api:app", host="0.0.0.0", port=port, reload=False)
