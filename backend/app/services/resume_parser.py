import pymupdf as fitz
from docx import Document


def extract_pdf_text(file_path):
    text = ""

    document = fitz.open(file_path)

    for page in document:
        text += page.get_text()

    document.close()

    return text.strip()


def extract_docx_text(file_path):
    document = Document(file_path)

    text = "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
    )

    return text.strip()


def extract_resume_text(file_path):
    if file_path.lower().endswith(".pdf"):
        return extract_pdf_text(file_path)

    if file_path.lower().endswith(".docx"):
        return extract_docx_text(file_path)

    raise ValueError("Only PDF and DOCX files are supported")