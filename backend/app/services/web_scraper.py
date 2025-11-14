"""
Web Scraper - Fetches and extracts text content from web pages
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Optional


def fetch_webpage_content(url: str) -> Optional[str]:
    """
    Fetch and extract text content from a webpage.
    
    Args:
        url: The URL of the webpage to fetch
    
    Returns:
        str: Extracted text content, or None if failed
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Get text
        text = soup.get_text(separator='\n', strip=True)
        
        # Clean up text
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        text = '\n'.join(lines)
        
        return text
        
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


def chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    """
    Split text into chunks of approximately chunk_size characters.
    
    Args:
        text: The text to split
        chunk_size: Approximate size of each chunk
    
    Returns:
        List[str]: List of text chunks
    """
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def fetch_multiple_urls(urls: List[str]) -> List[str]:
    """
    Fetch content from multiple URLs and return as text chunks.
    
    Args:
        urls: List of URLs to fetch
    
    Returns:
        List[str]: All text chunks from all URLs
    """
    all_chunks = []
    
    for url in urls:
        content = fetch_webpage_content(url)
        if content:
            chunks = chunk_text(content)
            all_chunks.extend(chunks)
    
    return all_chunks
