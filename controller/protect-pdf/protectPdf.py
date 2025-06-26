import sys
from PyPDF2 import PdfReader, PdfWriter

def protect_pdf(input_file, output_file, password):
    # Create a PdfReader object
    reader = PdfReader(input_file)
    writer = PdfWriter()
    
    # Copy all pages to the writer
    for page in reader.pages:
        writer.add_page(page)
    
    # Set the user password and owner password
    writer.encrypt(password)
    
    # Write the encrypted PDF to the output file
    with open(output_file, "wb") as out_file:
        writer.write(out_file)
        print(f"PDF protected and saved as: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: protectPdf.py <source_file> <output_file> <password>")
        sys.exit(1)
    
    source_file = sys.argv[1]
    output_file = sys.argv[2]
    password = sys.argv[3]
    
    try:
        protect_pdf(source_file, output_file, password)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
