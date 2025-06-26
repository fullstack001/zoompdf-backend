import argparse
from pdf2docx import Converter

def convert_pdf_to_docx(pdf_file, docx_file):
    cv = Converter(pdf_file)
    cv.convert(docx_file)
    cv.close()

if __name__ == "__main__":
    # Set up the argument parser
    parser = argparse.ArgumentParser(description="Convert PDF to DOCX")
    parser.add_argument("pdf_file", help="Path to the input PDF file")
    parser.add_argument("docx_file", help="Path to the output DOCX file")

    # Parse the command-line arguments
    args = parser.parse_args()

    # Call the function with the provided arguments
    convert_pdf_to_docx(args.pdf_file, args.docx_file)