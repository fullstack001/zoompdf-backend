import sys
import os
import camelot
from openpyxl import Workbook

def convert_pdf_to_excel(pdf_path, excel_path):
    try:
        print(f"Starting conversion: {pdf_path} to {excel_path}")
        sys.stdout.flush()

        # Ensure the input file exists
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Input file does not exist: {pdf_path}")

        # Use camelot to extract tables from the PDF
        tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream')  # Stream is good for structured tables

        if len(tables) == 0:
            print("No tables found in the PDF.")
            return False

        # Create a new Excel workbook
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Page_1"

        # Write extracted tables to Excel
        for table_number, table in enumerate(tables, start=1):
            if table_number > 1:
                sheet = workbook.create_sheet(title=f"Page_{table_number}")

            # Add table rows
            for row in table.df.values:  # table.df is the table as a DataFrame
                sheet.append(list(row))  # Append rows as lists

        # Save the workbook
        workbook.save(excel_path)

        print(f"Conversion successful: {excel_path}")
        return True

    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convertPdfToExcel.py <pdf_path> <excel_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    excel_path = sys.argv[2]

    success = convert_pdf_to_excel(pdf_path, excel_path)
    sys.exit(0 if success else 1)
