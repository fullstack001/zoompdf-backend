"use strict";

const { PythonShell } = require("python-shell");
// libre.convertAsync = require("util").promisify(libre.convert);

function protectPdf(files, password) {
    return new Promise((resolve, reject) => {
        let outFiles = [];
        files.forEach(async (file) => {
            const sourceFilePath = await `temp_uploads/${file.filename}`;
            const outputFilePath = await `temp_uploads/${file.filename.split(".")[0]
                }_protect.pdf`;

            // Options for the PythonShell
            const options = {
                scriptPath: "controller/protect-pdf", // Replace with the actual path to your Python script
                args: [sourceFilePath, outputFilePath, password],
            };

            //Run the Python Script

            await PythonShell.run("protectPdf.py", options, (err) => {
                if (err) throw err;
            });
            await outFiles.push(outputFilePath);
            if (outFiles.length == files.length) {
                resolve(outFiles);
            }
        });
    });
}

module.exports = protectPdf;
