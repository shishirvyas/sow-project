import logging
from pathlib import Path
from docx import Document
from PyPDF2 import PdfReader

def extract_text_from_docx(path: Path) -> str:
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        logging.error(f"Failed to extract text from DOCX {path}: {e}")
        return ""

def extract_text_from_pdf(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
        parts = []
        for p in reader.pages:
            try:
                t = p.extract_text() or ""
            except Exception as page_err:
                logging.warning(f"Failed to extract text from page in {path}: {page_err}")
                t = ""
            if t:
                parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        logging.error(f"Failed to extract text from PDF {path}: {e}")
        return ""

def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return extract_text_from_docx(path)
    elif suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    else:
        logging.warning(f"Unsupported file type: {path.suffix} for file {path}")
        return ""
