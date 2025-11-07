#!/usr/bin/env python3
import os, sys, uuid, time, hashlib
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

from openai import OpenAI, APIError, RateLimitError
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from tqdm import tqdm

# ---------- Utils ----------
def require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return v

def slugify(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")

def normalize_ws(s: str) -> str:
    return " ".join(s.split())

# ---------- PDF ----------
def extract_pdf_words(pdf_path: Path) -> Tuple[List[str], List[int]]:
    reader = PdfReader(str(pdf_path))
    words: List[str] = []
    pages: List[int] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "")
        text = normalize_ws(text)
        if not text:
            continue
        page_words = text.split()
        words.extend(page_words)
        pages.extend([idx] * len(page_words))
    if not words:
        raise RuntimeError("PDF contains no extractable text.")
    return words, pages

def chunk_words(words: Sequence[str], page_map: Sequence[int], chunk_size: int, overlap: int):
    if chunk_size <= overlap:
        raise ValueError("chunk_size must be greater than overlap.")
    step = chunk_size - overlap
    i = 0
    while i < len(words):
        end = min(i + chunk_size, len(words))
        tok = words[i:end]
        if not tok:
            break
        start_page = page_map[i]
        end_page = page_map[end - 1]
        section = f"Página {start_page}" if start_page == end_page else f"Páginas {start_page}-{end_page}"
        yield {
            "text": " ".join(tok),
            "start_page": start_page,
            "end_page": end_page,
            "section": section,
        }
        if end == len(words):
            break
        i += step

# ---------- Embeddings (batched) ----------
def embed_texts_batched(
    client: OpenAI,
    texts: List[str],
    model: str,
    batch: int = 32,
    pause: float = 0.0,
) -> List[List[float]]:
    out: List[List[float]] = []
    max_attempts = 10
    for i in tqdm(range(0, len(texts), batch), desc="🧠 Embeddings"):
        part = texts[i:i+batch]
        attempt = 0
        while True:
            try:
                resp = client.embeddings.create(model=model, input=part)
                out.extend([item.embedding for item in resp.data])
                break
            except RateLimitError as e:
                attempt += 1
                if attempt >= max_attempts:
                    raise
                wait = 10.0
                response = getattr(e, "response", None)
                headers = getattr(response, "headers", {}) or {}
                retry_after = headers.get("retry-after") or headers.get("Retry-After")
                if retry_after:
                    try:
                        wait = float(retry_after)
                    except ValueError:
                        pass
                print(
                    f"⚠️  Rate limit na OpenAI, aguardando {wait:.1f}s (tentativa {attempt}/{max_attempts})...",
                    file=sys.stderr,
                )
                time.sleep(wait)
                continue
            except APIError as e:
                attempt += 1
                if attempt >= max_attempts:
                    raise
                backoff = 1.5 * attempt
                print(
                    f"⚠️  Erro ao gerar embeddings ({e}), aguardando {backoff:.1f}s (tentativa {attempt}/{max_attempts})...",
                    file=sys.stderr,
                )
                time.sleep(backoff)
                continue
            except Exception as e:
                attempt += 1
                if attempt >= max_attempts:
                    raise
                backoff = 1.5 * attempt
                print(
                    f"⚠️  Erro inesperado ao gerar embeddings ({e}), aguardando {backoff:.1f}s (tentativa {attempt}/{max_attempts})...",
                    file=sys.stderr,
                )
                time.sleep(backoff)
        if pause:
            time.sleep(pause)
    return out

# ---------- Qdrant ----------
def ensure_collection(qd: QdrantClient, name: str, dim: int):
    try:
        info = qd.get_collection(name)
    except Exception:
        qd.recreate_collection(
            collection_name=name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        return

    current_dim = None
    try:
        config = getattr(info, "config", None)
        params = getattr(config, "params", None)
        vectors_cfg = getattr(params, "vectors", None) if params else None
        if vectors_cfg:
            current_dim = getattr(vectors_cfg, "size", None)
    except AttributeError:
        current_dim = None

    if current_dim and current_dim != dim:
        print(
            f"ℹ️  Ajustando coleção '{name}' de dimensão {current_dim} para {dim}.",
            file=sys.stderr,
        )
        qd.recreate_collection(
            collection_name=name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )

def upsert_chunks_batched(
    qdrant: QdrantClient,
    collection: str,
    embeddings: Sequence[Sequence[float]],
    chunks: Sequence[Dict],
    payload_base: Dict,
    batch: int = 256,
):
    assert len(embeddings) == len(chunks)
    for i in tqdm(range(0, len(chunks), batch), desc="⬆️  Upsert Qdrant"):
        pts = []
        for j, (vec, ch) in enumerate(zip(embeddings[i:i+batch], chunks[i:i+batch])):
            # dedupe hash por texto
            h = hashlib.sha256(ch["text"].encode("utf-8")).hexdigest()
            payload = {
                **payload_base,
                "section": ch["section"],
                "page": ch["start_page"],
                "ord": i + j,
                "text": ch["text"],
                "text_hash": h,
            }
            pts.append(PointStruct(id=str(uuid.uuid4()), vector=vec, payload=payload))
        qdrant.upsert(collection_name=collection, points=pts)

# ---------- Main ----------
def main():
    # CLI: python ingest.py <pdf_path> <title> <url> [agent_slug]
    if len(sys.argv) < 4:
        print("Usage: python ingest.py <pdf_path> <title> <url> [agent_slug]", file=sys.stderr)
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    title = sys.argv[2]
    url = sys.argv[3]
    agent = sys.argv[4] if len(sys.argv) >= 5 else "agostinho"

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    OPENAI_API_KEY = require_env("OPENAI_API_KEY")
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

    words, page_map = extract_pdf_words(pdf_path)
    chunks = list(chunk_words(words, page_map, chunk_size=600, overlap=100))
    if not chunks:
        raise RuntimeError("No chunks produced from the PDF.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    texts = [c["text"] for c in chunks]
    try:
        embed_batch = int(os.getenv("OPENAI_EMBED_BATCH", "") or 32)
    except ValueError:
        embed_batch = 32
    embed_batch = max(1, embed_batch)
    try:
        embed_pause = float(os.getenv("OPENAI_EMBED_PAUSE", "") or 0.0)
    except ValueError:
        embed_pause = 0.0
    embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
    embs = embed_texts_batched(
        client,
        texts,
        model=embed_model,
        batch=embed_batch,
        pause=embed_pause,
    )

    qd = QdrantClient(url=QDRANT_URL)
    collection = f"passages_{agent}"
    vector_size = len(embs[0]) if embs else 0
    if vector_size <= 0:
        raise RuntimeError("Failed to generate embeddings.")
    ensure_collection(qd, collection, dim=vector_size)

    payload_base = {
        "agentSlug": agent,
        "title": title,
        "docId": slugify(title),
        "url": url,
    }
    upsert_chunks_batched(qd, collection, embs, chunks, payload_base, batch=256)

    print(f"✅ Ingested {len(chunks)} chunks into '{collection}' for agent '{agent}'.")

if __name__ == "__main__":
    main()
