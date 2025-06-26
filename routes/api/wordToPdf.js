"use strict";

const path = require("path");
const fs = require("fs").promises;
const { PDFDocument, degrees } = require("pdf-lib");

const libre = require("libreoffice-convert");
libre.convertAsync = require("util").promisify(libre.convert);

function wordToPdf(files, degree) {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    const ext = ".pdf";
    files.forEach(async (file, index) => {
      const sourceFilePath = await `temp_uploads/${file.filename}`;
      const outputFilePath = await `temp_uploads/${
        file.filename.split(".")[0]
      }.pdf`;

      // Read file
      const docxBuf = await fs.readFile(sourceFilePath);

      // Convert it to pdf format with undefined filter (see Libreoffice docs about filter)
      let pdfBuf = await libre.convertAsync(docxBuf, ext, undefined);

      if (Number(degree[index]) > 0) {
        console.log(degree[index]);
        const mergedPdf = await PDFDocument.create();
        const pdfBytes = new Uint8Array(pdfBuf);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        copiedPages.forEach((page) => {
          page.setRotation(degrees(Number(degree[index])));
          mergedPdf.addPage(page);
        });

        pdfBuf = await mergedPdf.save();
      }
      // Here in done you have pdf file which you can save or transfer in another stream
      await fs.writeFile(outputFilePath, pdfBuf);
      console.log("complete");
      outFiles.push(outputFilePath);
      if (outFiles.length == files.length) {
        resolve(outFiles);
      }
    });
  });
}

module.exports = wordToPdf;
