"use strict";

const { PythonShell } = require("python-shell");
const fs = require('fs').promises;

async function convertSingleFile(file) {
  const sourceFilePath = `temp_uploads/${file.filename}`;
  const outputFilePath = `temp_uploads/${file.filename.split(".")[0]}.pptx`;

  const options = {
    scriptPath: "controller/pdf-ppt/",
    args: [sourceFilePath, outputFilePath],
    mode: 'text'
  };

  return new Promise((resolve, reject) => {
    let pyshell = new PythonShell("convertPdfToPpt.py", options);

    pyshell.on('message', function (message) {
      console.log(`[${file.filename}] Python output:`, message);
    });

    pyshell.end(async function (err, code, signal) {
      // Always try to terminate the Python process
      try {
        if (pyshell.childProcess) {
          pyshell.childProcess.kill();
        }
      } catch (killError) {
        console.error('Error killing Python process:', killError);
      }

      if (err) {
        console.error(`Error converting file: ${file.filename}`, err);
        reject(new Error(`Failed to process ${file.filename}: ${err.message}`));
        return;
      }

      try {
        // Check if the output file exists
        await fs.access(outputFilePath);
        console.log(`Successfully processed ${file.filename}`);
        resolve(outputFilePath);
      } catch (error) {
        console.log(error);
        reject(new Error(`Failed to generate output file for ${file.filename}`));
      }
    });
  });
}

async function pdfToPpt(files) {
  // Process files in sequence to avoid memory issues
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const result = await convertSingleFile(file);
      results.push(result);
    } catch (error) {
      console.error(`Error processing ${file.filename}:`, error);
      errors.push({ file: file.filename, error: error.message });
    }
  }

  if (errors.length > 0) {
    const errorMessage = errors.map(e => `${e.file}: ${e.error}`).join('; ');
    throw new Error(`Some files failed to convert: ${errorMessage}`);
  }

  return results;
}

module.exports = pdfToPpt;
