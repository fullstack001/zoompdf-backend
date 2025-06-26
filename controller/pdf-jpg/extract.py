import sys
import os
from PyPDF2 import PdfReader

def main(input_pdf, output_dir):
    reader = PdfReader(input_pdf)
    image_count = 0

    for i, page in enumerate(reader.pages):
        if "/XObject" in page.get("/Resources", {}):
            xObject = page["/Resources"]["/XObject"].get_object()
            for obj in xObject:
                if xObject[obj]["/Subtype"] == "/Image":
                    data = xObject[obj]._data
                    image_path = os.path.join(output_dir, f"image_{image_count+1}.jpg")
                    with open(image_path, "wb") as f:
                        f.write(data)
                    image_count += 1
    print(f"Extracted {image_count} images from PDF.")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
