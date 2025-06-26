"use strict";

const path = require("path");
const fs = require("fs").promises;
const { PDFDocument, degrees } = require("pdf-lib");

const libre = require("libreoffice-convert");
libre.convertAsync = require("util").promisify(libre.convert);

function excelToPdf(files) {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    const ext = ".pdf";

    files.forEach(async (file, index) => {
      try {
        const sourceFilePath = `temp_uploads/${file.filename}`;
        const outputFilePath = `temp_uploads/${
          file.filename.split(".")[0]
        }.pdf`;

        // Read the Excel file
        const excelBuffer = await fs.readFile(sourceFilePath);

        // Convert Excel to PDF using LibreOffice
        let pdfBuffer = await libre.convertAsync(excelBuffer, ext, undefined);

               // Save the converted PDF file
        await fs.writeFile(outputFilePath, pdfBuffer);
        console.log(`Conversion complete for: ${file.filename}`);
        outFiles.push(outputFilePath);

        // Resolve when all files are processed
        if (outFiles.length === files.length) {
          resolve(outFiles);
        }
      } catch (error) {
        reject(`Error processing file ${file.filename}: ${error.message}`);
      }
    });
  });
}

module.exports = excelToPdf;
