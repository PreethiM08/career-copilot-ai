from pypdf import PdfReader
from io import BytesIO

def extract_text_by_page(file_bytes: bytes) -> list[dict]:
    """
    Returns a list of {"page": int, "text": str} for each page in the PDF.
    """
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page": i + 1, "text": text})
    return pages