import sys
import os
import html

try:
    import fitz  # PyMuPDF
except ImportError as e:
    print(f"Error importing PyMuPDF: {e}")
    sys.stdout.flush()
    print("Ensure PyMuPDF is installed using 'pip install pymupdf'")
    sys.stdout.flush()
    sys.exit(1)


def convert_pdf_to_epub(pdf_path, epub_path):
    try:
        print(f"Starting conversion: {pdf_path} to {epub_path}")
        sys.stdout.flush()

        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Input file does not exist: {pdf_path}")

        # Open the PDF file
        pdf_document = fitz.open(pdf_path)

        with open(epub_path, "w", encoding="utf-8") as epub_file:
            epub_file.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            epub_file.write('<!DOCTYPE html>\n')
            epub_file.write('<html>\n<head>\n<title>PDF to EPUB</title>\n</head>\n<body>\n')

            for page_number in range(len(pdf_document)):
                page = pdf_document[page_number]
                text = page.get_text("text")  # Extract plain text
                safe_text = html.escape(text).replace('\n', '<br>\n')  # Make HTML-safe
                epub_file.write(f"<h2>Page {page_number + 1}</h2>\n")
                epub_file.write(f"<p>{safe_text}</p>\n")

            epub_file.write('</body>\n</html>')

        print(f"✅ Conversion successful: {epub_path}")
        sys.stdout.flush()
        return True

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.stdout.flush()
        return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_pdf_to_epub.py <pdf_path> <epub_path>")
        sys.stdout.flush()
        sys.exit(1)

    pdf_path = sys.argv[1]
    epub_path = sys.argv[2]

    success = convert_pdf_to_epub(pdf_path, epub_path)
    sys.exit(0 if success else 1)
