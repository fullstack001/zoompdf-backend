const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

async function epubToPdf(files) {
  const outfiles = [];

  for (const file of files) {
    const epubPath = path.join("temp_uploads", file.filename);
    const pdfPath = path.join("temp_uploads", `${file.filename.split(".")[0]}.pdf`);

    try {
      // Simulate EPUB to PDF conversion (replace with actual logic)
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      page.drawText("Converted from EPUB", { x: 50, y: 750 });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(pdfPath, pdfBytes);

      outfiles.push(pdfPath);
    } catch (error) {
      console.error(`Error converting ${file.filename} to PDF:`, error);
    }
  }

  return outfiles;
}

module.exports = epubToPdf;
