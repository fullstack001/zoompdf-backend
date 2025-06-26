import sys
import os
from pdf2image import convert_from_path

def main(input_pdf, output_dir):
    images = convert_from_path(input_pdf)
    for i, image in enumerate(images):
        image_path = os.path.join(output_dir, f"page_{i+1}.jpg")
        image.save(image_path, "JPEG")
    print("PDF pages successfully converted to images.")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
