const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const pdfToJpg = async (fileNames, level) => {
  const outputFiles = [];
  const tempDirs = [];
  const tempUploadDir = path.join(__dirname, "../../temp_uploads");
  fs.mkdirSync(tempUploadDir, { recursive: true });

  for (let i = 0; i < fileNames.length; i++) {
    const inputPdfPath = path.join(tempUploadDir, fileNames[i]);
    const outputDir = path.join(tempUploadDir, `${Date.now()}_${i}`);
    fs.mkdirSync(outputDir, { recursive: true });
    tempDirs.push(outputDir);

    const scriptName = level === "page" ? "pageJpg.py" : "extract.py";
    await runPythonScript(scriptName, inputPdfPath, outputDir);

    const images = fs.readdirSync(outputDir);
    images.forEach((img) => {
      const imgPath = path.join(outputDir, img);
      outputFiles.push(imgPath);
    });
  }

  return { outfiles: outputFiles, tempDirs };
};

// Helper function to run Python scripts
function runPythonScript(scriptName, inputPdf, outputDir) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const pythonProcess = spawn("python3", [scriptPath, inputPdf, outputDir]);

    pythonProcess.stdout.on("data", (data) => console.log(`Python stdout: ${data}`));
    pythonProcess.stderr.on("data", (data) => console.error(`Python stderr: ${data}`));

    pythonProcess.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script ${scriptName} failed with code ${code}`));
    });
  });
}

module.exports = pdfToJpg;
