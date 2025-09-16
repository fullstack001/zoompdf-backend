"use strict";

const { PythonShell } = require("python-shell");

function pdfToEpub(files) {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    let errors = [];
    let processedCount = 0;

    files.forEach((file) => {
      const sourceFilePath = `temp_uploads/${file.filename}`;
      const outputFilePath = `temp_uploads/${file.filename.split(".")[0]}.epub`;

      const options = {
        scriptPath: "controller/pdf-epub",
        args: [sourceFilePath, outputFilePath],
      };

      const pyshell = new PythonShell("convertPdfToEpub.py", options);

      pyshell.on("message", (message) => {
        console.log(`[Python] ${message}`);
      });

      pyshell.on("stderr", (stderr) => {
        console.error(`[Python STDERR] ${stderr}`);
      });

      pyshell.end((err, code, signal) => {
        processedCount++;

        if (err) {
          console.error(`Error processing file ${file}:`, err.message);
          errors.push({ file, error: err.message });
        } else {
          outFiles.push(outputFilePath);
          console.log(`✅ File ${file} converted successfully to ${outputFilePath}`);
        }

        if (processedCount === files.length) {
          if (errors.length > 0) {
            console.error("Some files failed to process:", errors);
            resolve(outFiles);
          } else {
            resolve(outFiles);
          }
        }
      });
    });
  });
}


module.exports = pdfToEpub;
