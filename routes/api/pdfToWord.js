"use strict";

const { PythonShell } = require("python-shell");
// libre.convertAsync = require("util").promisify(libre.convert);

function wordToPdf(files) {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    const ext = ".pdf";
    files.forEach(async (file) => {
      const sourceFilePath = await `temp_uploads/${file.filename}`;
      const outputFilePath = await `temp_uploads/${
        file.filename.split(".")[0]
      }.docx`;

      // Options for the PythonShell
      const options = {
        scriptPath: "routes/api/", // Replace with the actual path to your Python script
        args: [sourceFilePath, outputFilePath],
      };

      //Run the Python Script

      await PythonShell.run("convertPdfToWord.py", options, (err) => {
        if (err) throw err;
      });
      await outFiles.push(outputFilePath);
      if (outFiles.length == files.length) {
        resolve(outFiles);
      }
    });
  });
}

module.exports = wordToPdf;
