"use strict";

const fs = require("fs").promises;
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const mime = require("mime-types"); // Replace file-type with mime-types

const pageSizes = {
    a4: { width: 595.28, height: 841.89 }, // A4 in points (1/72 inch)
    us: { width: 612, height: 792 }, // US Letter in points
};

const margins = {
    no: 0,
    small: 20,
    large: 40,
};

async function jpgToPdf(files, direction, pageSize="a4", margin="no", merge_selected) {
    try {
        const pdfDocs = merge_selected ? await PDFDocument.create() : [];
        const outputFiles = [];

        for (const file of files) {
            const imagePath = `temp_uploads/${file.filename}`;
            const imageBuffer = await fs.readFile(imagePath);

            const mimeType = mime.lookup(file.filename); // Detect MIME type based on file extension
            if (!mimeType || (mimeType !== "image/jpeg" && mimeType !== "image/png")) {
                console.warn(`Skipping unsupported file format: ${mimeType || "unknown"} (${file.filename})`);
                continue; // Skip unsupported files
            }

            const tempPdf = merge_selected ? pdfDocs : await PDFDocument.create();

            const pageMargin = margins[margin.toLowerCase()] || 0;
            let pageWidth, pageHeight;

            const embedImage = mimeType === "image/png" 
                ? await tempPdf.embedPng(imageBuffer) 
                : await tempPdf.embedJpg(imageBuffer);

            if (pageSize.toLowerCase() === "fit") {
                pageWidth = embedImage.width + pageMargin * 2;
                pageHeight = embedImage.height + pageMargin * 2;

                const page = tempPdf.addPage([pageWidth, pageHeight]);
                page.drawImage(embedImage, {
                    x: pageMargin,
                    y: pageMargin,
                    width: embedImage.width,
                    height: embedImage.height,
                });
            } else {
                const size = pageSizes[pageSize.toLowerCase()];
                if (!size) throw new Error(`Invalid page size: ${pageSize}`);

                const isLandscape = false;
                pageWidth = isLandscape ? size.height : size.width;
                pageHeight = isLandscape ? size.width : size.height;

                const aspectRatio = embedImage.width / embedImage.height;

                const availableWidth = pageWidth - pageMargin * 2;
                const availableHeight = pageHeight - pageMargin * 2;
                let drawWidth = availableWidth;
                let drawHeight = drawWidth / aspectRatio;

                if (drawHeight > availableHeight) {
                    drawHeight = availableHeight;
                    drawWidth = drawHeight * aspectRatio;
                }

                const xOffset = (pageWidth - drawWidth) / 2;
                const yOffset = (pageHeight - drawHeight) / 2;

                const page = tempPdf.addPage([pageWidth, pageHeight]);
                page.drawImage(embedImage, {
                    x: xOffset,
                    y: yOffset,
                    width: drawWidth,
                    height: drawHeight,
                });
            }

            if (!merge_selected) {
                const outputPdfPath = `temp_uploads/${path.parse(file.filename).name}.pdf`;
                const pdfBytes = await tempPdf.save();
                await fs.writeFile(outputPdfPath, pdfBytes);
                outputFiles.push(outputPdfPath);
            }
        }

        if (merge_selected) {
            const mergedPdfPath = "temp_uploads/merged_output.pdf";
            const mergedPdfBytes = await pdfDocs.save();
            await fs.writeFile(mergedPdfPath, mergedPdfBytes);
            return [mergedPdfPath];
        }

        return outputFiles;
    } catch (error) {
        throw new Error(`Error during PDF generation: ${error.message}`);
    }
}

module.exports = jpgToPdf;
