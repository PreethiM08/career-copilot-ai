from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_pages(pages: list[dict], chunk_size: int = 800, chunk_overlap: int = 150) -> list[dict]:
    """
    Input: [{"page": 1, "text": "..."}, ...]
    Output: [{"page": 1, "chunk_index": 0, "text": "..."}, ...]
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for page in pages:
        page_chunks = splitter.split_text(page["text"])
        for idx, chunk_text in enumerate(page_chunks):
            chunks.append({
                "page": page["page"],
                "chunk_index": idx,
                "text": chunk_text,
            })
    return chunks