import json
import time
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_LIST_URL = "https://www.primariatm.ro/hcl"
BASE_URL = "https://www.primariatm.ro"

# limitezi la ultimii ani (poți schimba)
MIN_YEAR = 2020
MAX_PAGES = 300  # safety net, să nu te duci în 1999 dacă ceva e ciudat

# cuvinte-cheie pentru urbanism (le poți ajusta după ce vezi ce prinde)
URBANISM_KEYWORDS = [
    "plan urbanistic zonal",
    "plan urbanistic de detaliu",
    "plan urbanistic general",
    "plan urbanistic",
    "puz",
    "pud",
    "pug",
    "documentație de urbanism",
    "documentatie de urbanism",
    "regulament local de urbanism",
    "reglementări urbanistice",
    "reglementari urbanistice",
    "zonă funcțională",
    "zona functionala",
    "unități teritoriale de referință",
    "unitati teritoriale de referinta",
    "construire locuință",
    "construire locuinta",
    "extindere locuință",
    "extindere locuinta",
    "schimbare de destinație",
    "schimbare de destinatie",
    "clădire",
    "cladire",
    "autorizație de construire",
    "autorizatie de construire",
    "certificat de urbanism",
]


DATA_DIR = Path(__file__).resolve().parent / "knowledge"
DATA_DIR.mkdir(parents=True, exist_ok=True)
HCL_JSONL_PATH = DATA_DIR / "timisoara_hcl.jsonl"
HCL_CHUNKS_PATH = DATA_DIR / "timisoara_hcl_chunks.jsonl"


@dataclass
class HCLItem:
    id: str
    hcl_number: int
    year: int
    title: str
    detail_url: str
    adopt_date: Optional[str]
    publish_date: Optional[str]
    urbanism_relevant: bool
    urbanism_tags: List[str]
    raw_text: str


def fetch_list_page(page: int) -> str:
    """Descarcă o pagină de listă HCL (10 hotărâri/pagină)."""
    params = {}
    if page > 1:
        params["page"] = page
    resp = requests.get(BASE_LIST_URL, params=params, timeout=15)
    resp.raise_for_status()
    return resp.text


def parse_hcl_links_from_list(html: str) -> List[Dict]:
    """
    Găsește link-urile de tip HCL xxx / yyyy ... din pagina de listă.
    Returnează dict cu title, url, number, year.
    """
    soup = BeautifulSoup(html, "html.parser")
    results: List[Dict] = []

    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        # căutăm pattern de tip "HCL 581 / 2025 ..."
        m = re.match(r"HCL\s+(\d+)\s*/\s*(\d{4})", text)
        if not m:
            continue

        number = int(m.group(1))
        year = int(m.group(2))
        url = urljoin(BASE_URL, a["href"])

        results.append(
            {
                "title": text,
                "url": url,
                "number": number,
                "year": year,
            }
        )

    return results


def fetch_hcl_detail(url: str) -> str:
    """Descarcă pagina detaliată a HCL-ului."""
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    return resp.text


def extract_dates_and_text_from_detail(html: str) -> Dict[str, Optional[str]]:
    """
    Din pagina HCL extrage:
    - textul principal (motivație + articole)
    - Data adoptării
    - Data publicării (dacă există)
    Heuristică simplă: luăm doar textul din zona de conținut.
    """
    soup = BeautifulSoup(html, "html.parser")

    # În majoritatea site-urilor, conținutul e în <main>, dar dacă nu există, luăm tot.
    main = soup.find("main")
    if main is None:
        main = soup

    text = main.get_text(separator="\n", strip=True)

    adopt_date = None
    publish_date = None

    # căutăm linii care încep cu "Data adoptării" / "Data publicării"
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for i, line in enumerate(lines):
        lower = line.lower()
        if "data adoptării" in lower or "data adoptarii" in lower:
            # următoarea linie ar trebui să fie data
            if i + 1 < len(lines):
                adopt_date = lines[i + 1]
        if "data publicării" in lower or "data publicarii" in lower:
            if i + 1 < len(lines):
                publish_date = lines[i + 1]

    return {
        "text": text,
        "adopt_date": adopt_date,
        "publish_date": publish_date,
    }


def detect_urbanism(text: str, title: str) -> (bool, List[str]):
    """
    Verifică dacă HCL-ul este relevant pentru urbanism,
    în funcție de cuvinte-cheie în titlu + text.
    """
    combined = f"{title}\n{text}".lower()
    matched = []
    for kw in URBANISM_KEYWORDS:
        if kw in combined:
            matched.append(kw)
    return (len(matched) > 0, matched)


def chunk_text(text: str, max_chars: int = 1200) -> List[str]:
    """
    Taie textul în bucăți mai mici pentru RAG.
    Heuristică simplă: după linii, fără să rupem prea brutal.
    """
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if current_len + len(line) + 1 > max_chars:
            if current:
                chunks.append("\n".join(current))
            current = [line]
            current_len = len(line)
        else:
            current.append(line)
            current_len += len(line) + 1

    if current:
        chunks.append("\n".join(current))

    return chunks


def crawl_and_triage() -> List[HCLItem]:
    """
    Parcurge paginile de listă HCL, oprește când anul < MIN_YEAR,
    descarcă detaliile pentru HCL relevante și face trierea pe urbanism.
    """
    all_items: List[HCLItem] = []
    stop = False

    for page in range(1, MAX_PAGES + 1):
        print(f"=== Pagina {page} ===")
        html_list = fetch_list_page(page)
        hcl_links = parse_hcl_links_from_list(html_list)

        if not hcl_links:
            print("Nu am găsit niciun HCL pe această pagină. Mă opresc.")
            break

        for info in hcl_links:
            year = info["year"]
            if year < MIN_YEAR:
                print(f"Am ajuns la anul {year} (< {MIN_YEAR}). Mă opresc.")
                stop = True
                break

            title = info["title"]
            url = info["url"]
            number = info["number"]
            hcl_id = f"HCL_{number}_{year}"

            print(f"-> {hcl_id}: {title}")

            detail_html = fetch_hcl_detail(url)
            detail_data = extract_dates_and_text_from_detail(detail_html)

            urbanism_relevant, tags = detect_urbanism(
                detail_data["text"], title
            )

            item = HCLItem(
                id=hcl_id,
                hcl_number=number,
                year=year,
                title=title,
                detail_url=url,
                adopt_date=detail_data["adopt_date"],
                publish_date=detail_data["publish_date"],
                urbanism_relevant=urbanism_relevant,
                urbanism_tags=tags,
                raw_text=detail_data["text"],
            )
            all_items.append(item)

            # ca să nu "bombardăm" serverul
            time.sleep(0.5)

        if stop:
            break

    return all_items


def save_items_and_chunks(items: List[HCLItem]) -> None:
    """
    Salvează:
    - toate HCL-urile triate în timisoara_hcl.jsonl
    - doar cele urbanism_relevant în timisoara_hcl_chunks.jsonl (chunk-uite)
    """
    print(f"Scriu {len(items)} în {HCL_JSONL_PATH}")
    with HCL_JSONL_PATH.open("w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")

    # pregătim chunk-urile pentru RAG
    chunk_records = []
    for item in items:
        if not item.urbanism_relevant:
            continue
        chunks = chunk_text(item.raw_text)
        for i, ch in enumerate(chunks):
            chunk_records.append(
                {
                    "id": f"{item.id}_chunk_{i}",
                    "hcl_id": item.id,
                    "hcl_number": item.hcl_number,
                    "year": item.year,
                    "title": item.title,
                    "detail_url": item.detail_url,
                    "adopt_date": item.adopt_date,
                    "publish_date": item.publish_date,
                    "urbanism_tags": item.urbanism_tags,
                    "text": ch,
                }
            )

    print(f"Scriu {len(chunk_records)} chunk-uri în {HCL_CHUNKS_PATH}")
    with HCL_CHUNKS_PATH.open("w", encoding="utf-8") as f:
        for rec in chunk_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def main() -> None:
    items = crawl_and_triage()
    save_items_and_chunks(items)


if __name__ == "__main__":
    main()
