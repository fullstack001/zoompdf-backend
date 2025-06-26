"use strict";

const fs = require("fs").promises;
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");

const pageSizes = {
    a4: { width: 595.28, height: 841.89 }, // A4 in points (1/72 inch)
    us: { width: 612, height: 792 }, // US Letter in points
};

const margins = {
    no: 0,
    small: 20,
    large: 40,
};

async function jpgToPdf(files, direction, pageSize, margin, merge_selected) {
    try {
        const pdfDocs = merge_selected ? await PDFDocument.create() : [];
        const outputFiles = [];

        for (const file of files) {
            const imagePath = `temp_uploads/${file.filename}`;
            const imageBuffer = await fs.readFile(imagePath);
            const tempPdf = merge_selected ? pdfDocs : await PDFDocument.create();

            const pageMargin = margins[margin.toLowerCase()] || 0;
            let pageWidth, pageHeight;

            if (pageSize.toLowerCase() === "fit") {
                const image = await tempPdf.embedJpg(imageBuffer);
                pageWidth = image.width + pageMargin * 2;
                pageHeight = image.height + pageMargin * 2;

                const page = tempPdf.addPage([pageWidth, pageHeight]);
                page.drawImage(image, {
                    x: pageMargin,
                    y: pageMargin,
                    width: image.width,
                    height: image.height,
                });
            } else {
                const size = pageSizes[pageSize.toLowerCase()];
                if (!size) throw new Error(`Invalid page size: ${pageSize}`);

                const isLandscape = direction.toLowerCase() === "landscape";
                pageWidth = isLandscape ? size.height : size.width;
                pageHeight = isLandscape ? size.width : size.height;

                const image = await tempPdf.embedJpg(imageBuffer);
                const aspectRatio = image.width / image.height;

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
                page.drawImage(image, {
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
