"use strict";

const { PythonShell } = require("python-shell");
// libre.convertAsync = require("util").promisify(libre.convert);

function pdfToExcel() {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    files.forEach(async (file) => {
      const sourceFilePath = await `temp_uploads/${file.filename}`;
      const outputFilePath = await `temp_uploads/${file.filename.split(".")[0]
        }.xlsx`;

      // Options for the PythonShell
      const options = {
        scriptPath: "controller/pdf-excel", // Replace with the actual path to your Python script
        args: [sourceFilePath, outputFilePath],
      };

      //Run the Python Script

      await PythonShell.run("convertPdfToExcel.py", options, (err) => {
        if (err) throw err;
      });
      await outFiles.push(outputFilePath);
      if (outFiles.length == files.length) {
        resolve(outFiles);
      }
    });
  });
}

module.exports = pdfToExcel;
