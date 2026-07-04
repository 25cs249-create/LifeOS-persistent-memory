import os
import asyncio
from typing import Optional

# 1. LOAD CONFIGURATION FIRST
from dotenv import load_dotenv
load_dotenv()
print("LLM_PROVIDER =", os.getenv("LLM_PROVIDER"))
print("LLM_MODEL =", os.getenv("LLM_MODEL"))

print("EMBEDDING_PROVIDER =", os.getenv("EMBEDDING_PROVIDER"))
print("EMBEDDING_MODEL =", os.getenv("EMBEDDING_MODEL"))
os.environ.setdefault("LLM_PROVIDER", "gemini")
os.environ.setdefault("LLM_MODEL", "gemini/gemini-2.5-flash")
os.environ.setdefault("LLM_API_KEY", os.getenv("GEMINI_API_KEY", ""))
os.environ.setdefault("EMBEDDING_PROVIDER", "gemini")
os.environ.setdefault("EMBEDDING_MODEL", "gemini/gemini-embedding-001")
os.environ.setdefault("EMBEDDING_API_KEY", os.getenv("GEMINI_API_KEY", ""))
print("LLM_MODEL =", os.environ["LLM_MODEL"])
print("EMBEDDING_MODEL =", os.environ["EMBEDDING_MODEL"])
os.environ.setdefault("EMBEDDING_DIMENSIONS", "768")
os.environ.setdefault("VECTOR_DB_PROVIDER", "lancedb")
os.environ.setdefault("GRAPH_DATABASE_PROVIDER", "kuzu")

# 2. IMPORT COGNEE AFTER ENV VARS ARE SET
import cognee
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="LifeOS Cognee Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class RememberRequest(BaseModel):
    text: str
    dataset: Optional[str] = "lifeos"

class RecallRequest(BaseModel):
    query: str
    dataset: Optional[str] = "lifeos"

class FileDataRequest(BaseModel):
    content: str
    filename: str
    dataset: Optional[str] = "lifeos"

@app.get("/health")
async def health():
    """True health check: Verifies API keys and active database connections."""
    status = {"status": "ok", "components": {}}
    
    if not os.environ.get("LLM_API_KEY"):
        status["components"]["llm"] = "missing_key"
        status["status"] = "degraded"
    else:
        status["components"]["llm"] = "configured"

    try:
        graph_client = cognee.config.get_graph_engine()
        await graph_client.get_graph_visual_data() 
        status["components"]["graph_db"] = "connected"
    except Exception:
        status["components"]["graph_db"] = "offline"
        status["status"] = "degraded"
        
    return status

@app.post("/cognee/remember")
async def remember(req: RememberRequest):
    """Modern API: Ingests, chunks, embeds, and builds graph in one call."""
    try:
        await cognee.remember(req.text, dataset_name=req.dataset)
        return {"status": "ok", "message": "Memory stored and processed"}
    except Exception as e:
        print(f"Cognee pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Graph indexing failed, falling back to local DB.")

@app.post("/cognee/remember-file")
async def remember_file(req: FileDataRequest):
    try:
        await cognee.remember(req.content, dataset_name=req.dataset)
        return {"status": "ok", "message": f"File '{req.filename}' stored and processed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cognee/recall")
async def recall(req: RecallRequest):
    """Semantic graph search using the modern recall alias."""
    try:
        results = await cognee.recall(req.query)
        return {"status": "ok", "results": [str(r) for r in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cognee/graph")
async def get_graph(dataset: str = "lifeos"):
    """Extracts live topology directly from the graph engine."""
    try:
        graph_client = cognee.config.get_graph_engine()
        raw_graph_data = await graph_client.get_graph_visual_data()
        return {
            "status": "ok", 
            "graph": {
                "nodes": raw_graph_data.get("nodes", []),
                "edges": raw_graph_data.get("edges", [])
            }
        }
    except Exception as e:
        print(f"Graph extraction failed: {str(e)}")
        return {"status": "error", "graph": {"nodes": [], "edges": []}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)