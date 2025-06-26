"use strict";

const { PythonShell } = require("python-shell");
const fs = require('fs').promises;

async function convertSingleFile(file, password) {
    console.log(password)
    const sourceFilePath = `temp_uploads/${file.filename}`;
    const outputFilePath = `temp_uploads/${file.filename.split(".")[0]}_unlock.pdf`;

    const options = {
        scriptPath: "controller/unlock-pdf/",
        args: [sourceFilePath, outputFilePath, password, "wordList.txt"],
        mode: 'text'
    };

    return new Promise((resolve, reject) => {
        let pyshell = new PythonShell("unlockPdf.py", options);

        let isPasswordRequired = false; // Track if the message indicates a password is required

        pyshell.on('message', function (message) {
            console.log(`[${file.filename}] Python output:`, message);

            // Check if the message indicates a password is required
            if (message.includes("require_password")) {
                isPasswordRequired = true;
            }
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

                // Return a specific error if a password is required
                if (isPasswordRequired) {
                    reject(new Error("require_password"));
                } else {
                    reject(new Error(`Failed to process ${file.filename}: ${err.message}`));
                }
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

async function unlockPdf(file, password) {
    try {
        const result = await convertSingleFile(file, password);
        return result;
    } catch (error) {
        console.error(`Error processing ${file.filename}:`, error);
        throw error; // Propagate the error as-is
    }
}

module.exports = unlockPdf;
