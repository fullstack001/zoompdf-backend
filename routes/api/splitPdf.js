const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { exec } = require("child_process");

const splitPdf = (readPdf, pages, merge_flag, fileName) => {
  return new Promise(async (resolve, reject) => {
    let outFiles = [];
    if (merge_flag || pages.length == 1) {
      const newPdf = await PDFDocument.create();
      let selected = [];
      pages.forEach(async (planPage) => {
        for (let i = planPage[0]; i <= planPage[1]; i++) {
          selected.push(i - 1);
        }
      });
      for (let i = 0; i < selected.length; i++) {
        const [page] = await newPdf.copyPages(readPdf, [selected[i]]);
        await newPdf.addPage(page);
      }

      let bytes = await newPdf.save();
      let name = fileName.split(".")[0] + "_splitted.pdf";
      const outputPath = path.join("./temp_uploads/", name);
      await fs.promises.writeFile(outputPath, bytes);
      await outFiles.push(name);
      resolve(outFiles);
    } else {
      pages.forEach(async (page, index) => {
        const newPdf = await PDFDocument.create();
        for (let i = page[0]; i <= page[1]; i++) {
          const [page] = await newPdf.copyPages(readPdf, [i - 1]);
          await newPdf.addPage(page);
        }
        let bytes = await newPdf.save();
        let name = fileName.split(".")[0] + "_splitted_" + index + ".pdf";
        const outputPath = path.join("./temp_uploads/", name);
        await fs.promises.writeFile(outputPath, bytes);
        await outFiles.push(name);
        if (pages.length == outFiles.length) {
          resolve(outFiles);
        }
      });
    }
  });
};
module.exports = splitPdf;
