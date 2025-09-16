import sys
import os
from pdf2image import convert_from_path

def main(input_pdf, output_dir):
    images = convert_from_path(input_pdf)
    for i, image in enumerate(images):
        image_path = os.path.join(output_dir, f"page_{i+1}.png")
        image.save(image_path, "PNG")
    print("PDF pages successfully converted to PNG images.")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
