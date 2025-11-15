"""
Knowledge Loader - Loads and searches through local legal documents
"""

import os
import json
from pathlib import Path
from typing import List


# Directorul cu .txt (ce aveai deja)
KNOWLEDGE_BASE_DIR = Path(__file__).parent.parent.parent / "knowledge_base"

# Directorul unde scriu script-urile de ingestie JSONL (ingest_hcl_timisoara.py, ingest_constructii_timisoara.py)
JSON_KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge"


def load_all_documents() -> List[str]:
    """
    Load all text content from documents in the knowledge_base directory
    and from JSONL chunk files generate by the ingest scripts.
    
    - .txt din knowledge_base/
    - timisoara_hcl_chunks.jsonl din knowledge/
    - primariatm_constructii_chunks.jsonl din knowledge/
    
    Returns:
        List[str]: List of text chunks from all documents
    """
    chunks: List[str] = []

    # 1) .txt din knowledge_base (ce aveai deja)
    if KNOWLEDGE_BASE_DIR.exists():
        for file_path in KNOWLEDGE_BASE_DIR.rglob("*.txt"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Split into chunks of ~1000 characters for better context
                    chunk_size = 1000
                    for i in range(0, len(content), chunk_size):
                        chunk = content[i : i + chunk_size]
                        if chunk.strip():
                            chunks.append(chunk)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    # 2) JSONL din knowledge/ (HCL + Construcții)
    jsonl_files = [
        "timisoara_hcl_chunks.jsonl",
        "primariatm_constructii_chunks.jsonl",
    ]

    for fname in jsonl_files:
        path = JSON_KNOWLEDGE_DIR / fname
        if not path.exists():
            continue

        try:
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        text = obj.get("text")
                        if text and text.strip():
                            chunks.append(text)
                    except Exception as e:
                        print(f"Error parsing line in {path}: {e}")
        except Exception as e:
            print(f"Error reading {path}: {e}")

    return chunks


def search_relevant_chunks(
    question: str, all_chunks: List[str], max_results: int = 3
) -> List[str]:
    """
    Simple keyword-based search for relevant chunks.
    For better results, you could use embeddings and cosine similarity.
    
    Args:
        question: User's question
        all_chunks: All available text chunks
        max_results: Maximum number of chunks to return
    
    Returns:
        List[str]: Most relevant chunks
    """
    # Simple keyword matching - convert to lowercase for case-insensitive search
    question_lower = question.lower()
    keywords = set(question_lower.split())

    # Score each chunk based on keyword matches
    scored_chunks = []
    for chunk in all_chunks:
        chunk_lower = chunk.lower()
        score = sum(1 for keyword in keywords if keyword in chunk_lower)
        if score > 0:
            scored_chunks.append((score, chunk))

    # Sort by score and return top results
    scored_chunks.sort(reverse=True, key=lambda x: x[0])
    return [chunk for _, chunk in scored_chunks[:max_results]]
