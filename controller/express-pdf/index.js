const { exec } = require("child_process");

const compressFiles = (files, level) => {
  return new Promise((resolve, reject) => {
    let outFiles = [];
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let inputFilePath = `temp_uploads/${file}`;
      let outputFilePath = `temp_uploads/${file}_reduced.pdf`;
      let ghostScriptCommand = "";
      if (process.platform === "linux") {
        ghostScriptCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -dDownsampleColorImages=true -dColorImageResolution=${level} -sOutputFile=${outputFilePath} ${inputFilePath}`;
      } else {
        ghostScriptCommand = `gswin64c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -dDownsampleColorImages=true -dColorImageResolution=${level} -sOutputFile=${outputFilePath} ${inputFilePath}`;
      }

      exec(ghostScriptCommand, (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          reject(`stderr: ${stderr}`);
          return;
        }
        outFiles.push(outputFilePath);
        if (outFiles.length == files.length) {
          resolve(outFiles);
        }
      });
    }
  });
};

module.exports = compressFiles;
