import json
import time
from pathlib import Path
from typing import List, Dict
from dataclasses import dataclass, asdict

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://servicii.primariatm.ro"
CATEGORY_URL = BASE_URL + "/categorii/constructii"

DATA_DIR = Path(__file__).resolve().parent / "knowledge"
DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSONL = DATA_DIR / "primariatm_constructii.jsonl"
OUTPUT_CHUNKS = DATA_DIR / "primariatm_constructii_chunks.jsonl"


@dataclass
class DocPage:
    id: str
    url: str
    title: str
    raw_text: str


def fetch(url: str) -> str:
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    return resp.text


def extract_links(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    links = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/servicii/" in href:
            full = href if href.startswith("http") else BASE_URL + href
            title = a.get_text(strip=True)
            if title:
                links.append({"title": title, "url": full})

    return links


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main")
    if main is None:
        main = soup
    return main.get_text(separator="\n", strip=True)


def chunk_text(text: str, max_chars: int = 1200) -> List[str]:
    chunks = []
    current = []
    current_len = 0

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if current_len + len(line) > max_chars:
            chunks.append("\n".join(current))
            current = [line]
            current_len = len(line)
        else:
            current.append(line)
            current_len += len(line)

    if current:
        chunks.append("\n".join(current))
    return chunks


def main() -> None:
    print("=== Preiau lista paginilor pentru categoria Construcții ===")

    category_html = fetch(CATEGORY_URL)
    links = extract_links(category_html)

    print(f"Am găsit {len(links)} pagini în categoria construcții.")

    pages: List[DocPage] = []

    for i, link in enumerate(links):
        print(f"[{i+1}/{len(links)}] → {link['title']}")
        html = fetch(link["url"])
        text = extract_text(html)

        pages.append(
            DocPage(
                id=f"constructii_{i}",
                url=link["url"],
                title=link["title"],
                raw_text=text,
            )
        )
        time.sleep(0.3)

    # Salvez raw JSONL
    with OUTPUT_JSONL.open("w", encoding="utf-8") as f:
        for p in pages:
            f.write(json.dumps(asdict(p), ensure_ascii=False) + "\n")

    # Creez chunk-uri
    chunk_records = []
    for p in pages:
        chunks = chunk_text(p.raw_text)
        for idx, ch in enumerate(chunks):
            chunk_records.append({
                "id": f"{p.id}_chunk_{idx}",
                "url": p.url,
                "title": p.title,
                "text": ch
            })

    with OUTPUT_CHUNKS.open("w", encoding="utf-8") as f:
        for ch in chunk_records:
            f.write(json.dumps(ch, ensure_ascii=False) + "\n")

    print(f"Scrise {len(pages)} pagini brute și {len(chunk_records)} chunk-uri pentru RAG!")


if __name__ == "__main__":
    main()
