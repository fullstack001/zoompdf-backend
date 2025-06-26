const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { exec } = require("child_process");
const multer = require("multer");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fsExtra = require("fs-extra");
const archiver = require("archiver");
const fileSize = require("./fileSize");
const wordToPdf = require("./wordToPdf");
const pdfToWord = require("./pdfToWord");
const compressFiles = require("../../controller/express-pdf");
const pdfToPpt = require("../../controller/pdf-ppt");
const pptToPdf = require("../../controller/ppt-pdf");
const pdfToExcel = require("../../controller/pdf-excel");
const pdfToJpg = require("../../controller/pdf-jpg")
const excelToPdf = require("../../controller/excel-pdf");
const jpgToPdf = require("../../controller/jpg-pdf");
const protectPdf = require("../../controller/protect-pdf");
const unlockPdf = require("../../controller/unlock-pdf");
const splitPdf = require("./splitPdf");
const auth = require("../../middleware/auth");

const Pdf = require("../../models/Pdf");
const Clients = require("../../models/Clients");
const Blog = require("../../models/Blog");

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define the destination directory where uploaded files will be stored
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Define the filename of the uploaded file
    cb(null, uuidv4() + ".pdf");
  },
});

// Create a Multer instance with the configured storage
const upload = multer({ storage: storage });

// Set up Multer storage configuration(splited files)
const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define the destination directory where uploaded files will be stored
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Define the filename of the uploaded file
    cb(null, uuidv4() + ".zip");
  },
});

// Create a Multer instance with the configured storage(splited pdf)
const upload1 = multer({ storage: storage1 });

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "temp_uploads/"); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Rename the file - you can customize this as needed
    cb(null, uuidv4() + ".pdf");
  },
});

const upload2 = multer({ storage: storage2 });

const storage3 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "temp_uploads/"); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Rename the file - you can customize this as needed
    cb(null, uuidv4() + ".docx");
  },
});
const upload3 = multer({ storage: storage3 });

const storage4 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    // Rename the file - you can customize this as needed
    cb(null, uuidv4() + ".png");
  },
});
const upload4 = multer({ storage: storage4 });

//upload megered PDF
router.post("/pdf_upload", upload.single("pdf"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const newPdf = await Pdf.create({ name: uploadedFile.filename });

    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }

    // Process the uploaded PDF file here (e.g., save it, manipulate it, etc.)
    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error("error: " + error);
    res.status(500).send("Error processing file");
  }
});

//upload edited_pdf_upload
router.post("/edited_pdf_upload", upload.single("files"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const newPdf = await Pdf.create({ name: uploadedFile.filename });

    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }
    const deletes = req.body.deletes;
    const files = deletes.split(",");
    console.log(files);

    files.forEach((file) => {
      const filePath = path.join("./uploads/", file);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file ${file}:`, err);
        } else {
          console.log(`Deleted file: ${file}`);
        }
      });
    });

    // Process the uploaded PDF file here (e.g., save it, manipulate it, etc.)
    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

//upload png files
router.post("/png_upload", upload4.array("files"), async (req, res) => {
  try {
    let files = req.files;

    // Process the uploaded PDF file here (e.g., save it, manipulate it, etc.)
    res.status(200).send(files);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

//delete  pdf files
router.get("/delete/:file", (req, res) => {
  console.log(req.params.file);
  const filePath = `uploads/${req.params.file}`; // Replace this with the path to your file
  fs.unlink(filePath, (err) => {
    if (err) {
      res.status(500).send(err);
    }
    Clients.findOne({ file: req.params.file }).then((clients) => {
      clients.deleted = true;
      clients.save();
    });

    Pdf.deleteOne({ name: req.params.file }).then(() => {
      console.log("file name deleted from DB");
      res.send("delete success");
    });
  });
});

//upload splited pdf's Zip
router.post("/zip_upload", upload1.single("file"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const newPdf = await Pdf.create({ name: uploadedFile.filename });

    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }
    // Process the uploaded PDF file here (e.g., save it, manipulate it, etc.)
    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

// Endpoint for file download
router.get("/download/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = `./uploads/${fileName}`; // Path to the file to be downloaded

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("File not existing");
    }
  });
});

//get file name from DB
router.post("/get_from_db", async (req, res) => {
  console.log(req.body.name);
  await Pdf.findOne({ name: req.body.name })
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => res.status(500).send("File not found"));
});

//get file updated time
router.get("/time/:name", async (req, res) => {
  console.log(req.params.name);
  await Pdf.findOne({ name: req.params.name })
    .then((data) => {
      res.status(200).send(data.uploadTime);
    })
    .catch((err) => res.status(500).send("File not found"));
});

//Endpoint for split_files
router.post("/pdf_split", upload2.single("file"), async (req, res) => {
  let items = JSON.parse(req.body.items);
  let merge_flag = items.merge_flag;
  let pages = items.pages;
  file = req.file;
  const data = await fs.promises.readFile(`temp_uploads/${file.filename}`);
  const readPdf = await PDFDocument.load(data);
  splitPdf(readPdf, pages, merge_flag, file.filename).then((outFiles) => {
    compressFiles(outFiles, 100)
      .then((outfiles) => {
        if (outfiles.length > 1) {
          const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
          const directoryPath = "./temp_uploads/"; // temp_directory
          // Create a zip file in the parent directory
          const uploaded_zip = `${Date.now()}.zip`;
          const zipFileName = path.join(parentDirectory, uploaded_zip);
          const output = fs.createWriteStream(zipFileName);
          const archive = archiver("zip", {
            zlib: { level: 9 }, // Compression level (0-9)
          });

          output.on("close", () => {
            fs.readdir(directoryPath, (err, files) => {
              if (err) {
                console.error("Error reading directory:", err);
                return;
              }

              files.forEach((file) => {
                const filePath = path.join(directoryPath, file);

                fs.unlink(filePath, (err) => {
                  if (err) {
                    console.error(`Error deleting file ${file}:`, err);
                  }
                });
              });
            });

            const newPdf = Pdf.create({ name: uploaded_zip });
            res.send(uploaded_zip);
          });

          archive.on("error", (err) => {
            res.status(500).send({ error: `Error creating zip: ${err}` });
          });

          archive.pipe(output);

          // Add PDF files to the zip file
          outfiles.forEach((pdfFile, index) => {
            archive.file(pdfFile, {
              name: `${file.originalname.split(".")[0]}_splitted(${index}).pdf`,
            });
          });

          archive.finalize();
        } else {
          const sourcePath = outfiles[0]; // Replace with the path to the source file
          const uploaded_pdf = `${Date.now()}.pdf`;
          const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
          //delete origin file

          fs.unlinkSync(`./temp_uploads/${file.filename}`);

          // Move file from source directory to destination directory
          fs.rename(sourcePath, destinationPath, async (err) => {
            if (err) {
              console.error("Error moving file:", err);
            } else {
              console.log("File moved successfully!");
              const newPdf = Pdf.create({ name: uploaded_pdf });

              res.send(uploaded_pdf);
            }
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
});

//Endpoint for express-files
router.post("/pdf_compress", upload2.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  let level = req.body.level;
  let files = req.files;
  let names = files.map((file) => {
    return file.filename;
  });
  compressFiles(names, level)
    .then((outfiles) => {
      if (outfiles.length > 1) {
        const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
        const directoryPath = "./temp_uploads/"; // temp_directory
        // Create a zip file in the parent directory
        const uploaded_zip = `${Date.now()}.zip`;
        const zipFileName = path.join(parentDirectory, uploaded_zip);
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level (0-9)
        });

        output.on("close", () => {
          fs.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Error reading directory:", err);
              return;
            }

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${file}:`, err);
                }
              });
            });
          });

          const newPdf = Pdf.create({ name: uploaded_zip });
          fileSize(`./uploads/${uploaded_zip}`).then((size) => {
            console.log(size);
            res.send({ file: uploaded_zip, reSize: size });
          });
        });

        archive.on("error", (err) => {
          res.status(500).send({ error: `Error creating zip: ${err}` });
        });

        archive.pipe(output);

        // Add PDF files to the zip file
        outfiles.forEach((pdfFile, index) => {
          archive.file(pdfFile, {
            name: `${files[index].originalname.split(".")[0]}_compressed.pdf`,
          });
        });

        archive.finalize();
      } else {
        const sourcePath = outfiles[0]; // Replace with the path to the source file
        const uploaded_pdf = `${Date.now()}.pdf`;
        const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
        //delete origin file
        files.forEach(async (file) => {
          try {
            // Delete file from storage (assuming files are stored in a directory)
            fs.unlinkSync(`./temp_uploads/${file.filename}`);

            // Delete file from the database
            await Pdf.findByIdAndDelete(file._id);
            console.log(`File ${file.filename} deleted.`);
          } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
          }
        });

        // Move file from source directory to destination directory
        fs.rename(sourcePath, destinationPath, async (err) => {
          if (err) {
            console.error("Error moving file:", err);
          } else {
            console.log("File moved successfully!");
            const newPdf = Pdf.create({ name: uploaded_pdf });
            fileSize(`./uploads/${uploaded_pdf}`).then((size) => {
              console.log(size);
              res.send({ file: uploaded_pdf, reSize: size });
            });
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

router.post("/protect_pdf", upload2.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  let password = req.body.password;
  let files = req.files;

  protectPdf(files, password)
    .then((outfiles) => {
      if (outfiles.length > 1) {
        const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
        const directoryPath = "./temp_uploads/"; // temp_directory
        // Create a zip file in the parent directory
        const uploaded_zip = `${Date.now()}.zip`;
        const zipFileName = path.join(parentDirectory, uploaded_zip);
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level (0-9)
        });

        output.on("close", () => {
          fs.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Error reading directory:", err);
              return;
            }

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${file}:`, err);
                }
              });
            });
          });

          const newPdf = Pdf.create({ name: uploaded_zip });
          fileSize(`./uploads/${uploaded_zip}`).then((size) => {
            console.log(size);
            res.send({ file: uploaded_zip, reSize: size });
          });
        });

        archive.on("error", (err) => {
          res.status(500).send({ error: `Error creating zip: ${err}` });
        });

        archive.pipe(output);

        // Add PDF files to the zip file
        outfiles.forEach((pdfFile, index) => {
          archive.file(pdfFile, {
            name: `${files[index].originalname.split(".")[0]}_compressed.pdf`,
          });
        });

        archive.finalize();
      } else {
        const sourcePath = outfiles[0]; // Replace with the path to the source file
        const uploaded_pdf = `${Date.now()}.pdf`;
        const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
        //delete origin file
        files.forEach(async (file) => {
          try {
            // Delete file from storage (assuming files are stored in a directory)
            fs.unlinkSync(`./temp_uploads/${file.filename}`);

            // Delete file from the database
            await Pdf.findByIdAndDelete(file._id);
            console.log(`File ${file.filename} deleted.`);
          } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
          }
        });

        // Move file from source directory to destination directory
        fs.rename(sourcePath, destinationPath, async (err) => {
          if (err) {
            console.error("Error moving file:", err);
          } else {
            console.log("File moved successfully!");
            const newPdf = Pdf.create({ name: uploaded_pdf });
            fileSize(`./uploads/${uploaded_pdf}`).then((size) => {
              console.log(size);
              res.send({ file: uploaded_pdf, reSize: size });
            });
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

router.post("/unlock_pdf", upload2.array("files"), async (req, res) => {
  const files = req.files;
  const password = req.body.password || "";
  try {

    // Call unlockPdf and handle output
    const outfile = await unlockPdf(files[0], password);

    const sourcePath = outfile;
    const uploaded_pdf = `${Date.now()}.pdf`;
    const destinationPath = `./uploads/${uploaded_pdf}`;

    // Move the unlocked PDF to the final destination
    fs.rename(sourcePath, destinationPath, async (err) => {
      if (err) {
        console.error("Error moving file:", err);
        res.status(500).send({ error: "Error moving unlocked PDF." });
        return;
      }

      try {
        // Delete original files
        await Promise.all(
          files.map(async (file) => {
            const tempFilePath = `./temp_uploads/${file.filename}`;
            await fs.promises.unlink(tempFilePath);

          })
        );

        const newPdf = await Pdf.create({ name: uploaded_pdf });
        const size = await fileSize(`./uploads/${uploaded_pdf}`);
        res.send({ file: uploaded_pdf, reSize: size });
      } catch (err) {
        console.error("Error cleaning up files or saving metadata:", err);
        res.status(500).send({
          error: "Error cleaning up files or saving metadata.",
        });
      }
    });

  } catch (error) {
    try {
      // Clean up temporary files
      if (files && files[0] && files[0].filename) {
        const tempFilePath = `./temp_uploads/${files[0].filename}`;
        await fs.promises.unlink(tempFilePath);
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    console.error("Error in unlock_pdf endpoint:", error);
    res.status(500).send({
      msg: error.message || "An unexpected error occurred while unlocking the PDF.",
    });
  }
});


router.post("/pdf-to-jpg", upload2.array("files"), async (req, res) => {
  try {
    const level = req.body.level || "page";
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).send({ error: "No files uploaded." });
    }

    const tempUploadDir = path.join(__dirname, "../../temp_uploads");
    const uploadsDir = path.join(__dirname, "../../uploads");

    // Ensure necessary directories exist
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Extract filenames from uploaded files
    const fileNames = files.map((file) => file.filename);
    const originFilePaths = files.map((file) =>
      path.join(tempUploadDir, file.filename)
    );

    // Process PDFs and convert them to JPG
    const { outfiles, tempDirs } = await pdfToJpg(fileNames, level);

    if (outfiles.length > 1) {
      // Create ZIP for multiple JPG files
      const uploadedZip = `${Date.now()}.zip`;
      const zipFilePath = path.join(uploadsDir, uploadedZip);

      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", async () => {
        console.log(`Archive created: ${uploadedZip}`);

        // Cleanup temporary files and folders
        cleanupTempFiles(outfiles, tempDirs, originFilePaths);

        await Pdf.create({ name: uploadedZip });
        return res.send({ file: uploadedZip });
      });

      archive.on("error", (err) => {
        console.error("Error creating zip:", err);
        return res.status(500).send({ error: "Error creating ZIP file." });
      });

      archive.pipe(output);

      // Add JPG files to the ZIP
      outfiles.forEach((jpgFile, index) => {
        archive.file(jpgFile, { name: `pdfden_convert_${index}.jpg` });
      });

      await archive.finalize();
    } else {
      // Single file: move to uploads
      const sourcePath = outfiles[0];
      const uploadedJpg = `${Date.now()}.jpg`;
      const destinationPath = path.join(uploadsDir, uploadedJpg);

      fs.renameSync(sourcePath, destinationPath);

      // Cleanup temporary files and folders
      cleanupTempFiles(outfiles, tempDirs, originFilePaths);

      await Pdf.create({ name: uploadedJpg });
      return res.send({ file: uploadedJpg });
    }
  } catch (error) {
    console.error("Error processing PDF files:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

router.post("/powerpoint-to-pdf", upload3.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  let degree = req.body.degrees.split(",");
  let files = req.files;
  pptToPdf(files, degree).then((outfiles) => {
    if (outfiles.length > 1) {
      const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
      const directoryPath = "./temp_uploads/"; // temp_directory
      // Create a zip file in the parent directory
      const uploaded_zip = `${Date.now()}.zip`;
      const zipFileName = path.join(parentDirectory, uploaded_zip);
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression level (0-9)
      });

      output.on("close", () => {
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return;
          }

          files.forEach((file) => {
            const filePath = path.join(directoryPath, file);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file}:`, err);
              }
              // else {
              //   console.log(`Deleted file: ${file}`);
              // }
            });
          });
        });
        const newPdf = Pdf.create({ name: uploaded_zip });
        res.send(uploaded_zip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      // Add PDF files to the zip file
      outfiles.forEach((pdfFile, index) => {
        archive.file(pdfFile, {
          name: `${files[index].originalname.split(".")[0]}.pdf`,
        });
      });

      archive.finalize();
    } else {
      const sourcePath = outfiles[0]; // Replace with the path to the source file
      const uploaded_pdf = `${Date.now()}.pdf`;
      const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
      //delete origin file
      files.forEach(async (file) => {
        try {
          // Delete file from storage (assuming files are stored in a directory)
          fs.unlinkSync(`./temp_uploads/${file.filename}`);

          // Delete file from the database
          await Pdf.findByIdAndDelete(file._id);
          // console.log(`File ${file.filename} deleted.`);
        } catch (error) {
          console.error(`Error deleting file ${file.filename}:`, error);
        }
      });

      // Move file from source directory to destination directory
      fs.rename(sourcePath, destinationPath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
        } else {
          console.log("File moved successfully!");
          const newPdf = Pdf.create({ name: uploaded_pdf });

          res.send(uploaded_pdf);
        }
      });
    }
  });
});

router.post("/jpg-to-pdf", upload3.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  const { direction, pageSize, margin, merge_selected } = req.body;
  let files = req.files;
  jpgToPdf(files, direction, pageSize, margin, merge_selected).then((outfiles) => {
    if (outfiles.length > 1) {
      const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
      const directoryPath = "./temp_uploads/"; // temp_directory
      // Create a zip file in the parent directory
      const uploaded_zip = `${Date.now()}.zip`;
      const zipFileName = path.join(parentDirectory, uploaded_zip);
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression level (0-9)
      });

      output.on("close", () => {
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return;
          }

          files.forEach((file) => {
            const filePath = path.join(directoryPath, file);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file}:`, err);
              }
              // else {
              //   console.log(`Deleted file: ${file}`);
              // }
            });
          });
        });
        const newPdf = Pdf.create({ name: uploaded_zip });
        res.send(uploaded_zip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      // Add PDF files to the zip file
      outfiles.forEach((pdfFile, index) => {
        archive.file(pdfFile, {
          name: `${files[index].originalname.split(".")[0]}.pdf`,
        });
      });

      archive.finalize();
    } else {
      const sourcePath = outfiles[0]; // Replace with the path to the source file
      const uploaded_pdf = `${Date.now()}.pdf`;
      const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
      //delete origin file
      files.forEach(async (file) => {
        try {
          // Delete file from storage (assuming files are stored in a directory)
          fs.unlinkSync(`./temp_uploads/${file.filename}`);

          // Delete file from the database
          await Pdf.findByIdAndDelete(file._id);
          // console.log(`File ${file.filename} deleted.`);
        } catch (error) {
          console.error(`Error deleting file ${file.filename}:`, error);
        }
      });

      // Move file from source directory to destination directory
      fs.rename(sourcePath, destinationPath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
        } else {
          console.log("File moved successfully!");
          const newPdf = Pdf.create({ name: uploaded_pdf });

          res.send(uploaded_pdf);
        }
      });
    }
  });
});

router.post("/excel-to-pdf", upload3.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  let files = req.files;
  excelToPdf(files).then((outfiles) => {
    if (outfiles.length > 1) {
      const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
      const directoryPath = "./temp_uploads/"; // temp_directory
      // Create a zip file in the parent directory
      const uploaded_zip = `${Date.now()}.zip`;
      const zipFileName = path.join(parentDirectory, uploaded_zip);
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression level (0-9)
      });

      output.on("close", () => {
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return;
          }

          files.forEach((file) => {
            const filePath = path.join(directoryPath, file);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file}:`, err);
              }
              // else {
              //   console.log(`Deleted file: ${file}`);
              // }
            });
          });
        });
        const newPdf = Pdf.create({ name: uploaded_zip });
        res.send(uploaded_zip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      // Add PDF files to the zip file
      outfiles.forEach((pdfFile, index) => {
        archive.file(pdfFile, {
          name: `${files[index].originalname.split(".")[0]}.pdf`,
        });
      });

      archive.finalize();
    } else {
      const sourcePath = outfiles[0]; // Replace with the path to the source file
      const uploaded_pdf = `${Date.now()}.pdf`;
      const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
      //delete origin file
      files.forEach(async (file) => {
        try {
          // Delete file from storage (assuming files are stored in a directory)
          fs.unlinkSync(`./temp_uploads/${file.filename}`);

          // Delete file from the database
          await Pdf.findByIdAndDelete(file._id);
          // console.log(`File ${file.filename} deleted.`);
        } catch (error) {
          console.error(`Error deleting file ${file.filename}:`, error);
        }
      });

      // Move file from source directory to destination directory
      fs.rename(sourcePath, destinationPath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
        } else {
          console.log("File moved successfully!");
          const newPdf = Pdf.create({ name: uploaded_pdf });

          res.send(uploaded_pdf);
        }
      });
    }
  });
});

router.post("/wordtopdf", upload3.array("files"), async (req, res) => {
  // req.files contains the uploaded files
  let degree = req.body.degrees.split(",");
  let files = req.files;
  console.log(degree);
  wordToPdf(files, degree).then((outfiles) => {
    if (outfiles.length > 1) {
      const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
      const directoryPath = "./temp_uploads/"; // temp_directory
      // Create a zip file in the parent directory
      const uploaded_zip = `${Date.now()}.zip`;
      const zipFileName = path.join(parentDirectory, uploaded_zip);
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression level (0-9)
      });

      output.on("close", () => {
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
            console.error("Error reading directory:", err);
            return;
          }

          files.forEach((file) => {
            const filePath = path.join(directoryPath, file);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${file}:`, err);
              }
              // else {
              //   console.log(`Deleted file: ${file}`);
              // }
            });
          });
        });
        const newPdf = Pdf.create({ name: uploaded_zip });
        res.send(uploaded_zip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      // Add PDF files to the zip file
      outfiles.forEach((pdfFile, index) => {
        archive.file(pdfFile, {
          name: `${files[index].originalname.split(".")[0]}.pdf`,
        });
      });

      archive.finalize();
    } else {
      const sourcePath = outfiles[0]; // Replace with the path to the source file
      const uploaded_pdf = `${Date.now()}.pdf`;
      const destinationPath = `./uploads/${uploaded_pdf}`; // Replace with the path to the destination
      //delete origin file
      files.forEach(async (file) => {
        try {
          // Delete file from storage (assuming files are stored in a directory)
          fs.unlinkSync(`./temp_uploads/${file.filename}`);

          // Delete file from the database
          await Pdf.findByIdAndDelete(file._id);
          // console.log(`File ${file.filename} deleted.`);
        } catch (error) {
          console.error(`Error deleting file ${file.filename}:`, error);
        }
      });

      // Move file from source directory to destination directory
      fs.rename(sourcePath, destinationPath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
        } else {
          console.log("File moved successfully!");
          const newPdf = Pdf.create({ name: uploaded_pdf });

          res.send(uploaded_pdf);
        }
      });
    }
  });
});

router.post("/pdf_to_powerpoint", upload2.array("files"), async (req, res) => {
  let files = req.files;
  pdfToPpt(files)
    .then((outfiles) => {
      if (outfiles.length > 1) {
        const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
        const directoryPath = "./temp_uploads/"; // temp_directory
        // Create a zip file in the parent directory
        const uploaded_zip = `${Date.now()}.zip`;
        const zipFileName = path.join(parentDirectory, uploaded_zip);
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level (0-9)
        });

        output.on("close", () => {
          fs.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Error reading directory:", err);
              return;
            }

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${file}:`, err);
                } else {
                  console.log(`Deleted file: ${file}`);
                }
              });
            });
          });

          const newPdf = Pdf.create({ name: uploaded_zip });

          res.send(uploaded_zip);
        });

        archive.on("error", (err) => {
          res.status(500).send({ error: `Error creating zip: ${err}` });
        });

        archive.pipe(output);

        // Add PDF files to the zip file
        outfiles.forEach((pdfFile, index) => {
          archive.file(pdfFile, {
            name: `${files[index].originalname.split(".")[0]}.pptx`,
          });
        });

        archive.finalize();
      } else {
        const sourcePath = outfiles[0]; // Replace with the path to the source file
        const uploaded_docx = `${Date.now()}.pptx`;
        const destinationPath = `./uploads/${uploaded_docx}`; // Replace with the path to the destination
        //delete origin file
        files.forEach(async (file) => {
          try {
            // Delete file from storage (assuming files are stored in a directory)
            fs.unlinkSync(`./temp_uploads/${file.filename}`);

            // Delete file from the database
            await Pdf.findByIdAndDelete(file._id);
            console.log(`File ${file.filename} deleted.`);
          } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
          }
        });

        // Move file from source directory to destination directory
        fs.rename(sourcePath, destinationPath, async (err) => {
          if (err) {
            console.error("Error moving file:", err);
          } else {
            console.log("File moved successfully!");
            const newPdf = Pdf.create({ name: uploaded_docx });

            res.send(uploaded_docx);
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

router.post("/pdf_to_excel", upload2.array("files"), async (req, res) => {
  let files = req.files;
  pdfToExcel(files)
    .then((outfiles) => {
      if (outfiles.length > 1) {
        const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
        const directoryPath = "./temp_uploads/"; // temp_directory
        // Create a zip file in the parent directory
        const uploaded_zip = `${Date.now()}.zip`;
        const zipFileName = path.join(parentDirectory, uploaded_zip);
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level (0-9)
        });

        output.on("close", () => {
          fs.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Error reading directory:", err);
              return;
            }

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${file}:`, err);
                } else {
                  console.log(`Deleted file: ${file}`);
                }
              });
            });
          });

          const newPdf = Pdf.create({ name: uploaded_zip });

          res.send(uploaded_zip);
        });

        archive.on("error", (err) => {
          res.status(500).send({ error: `Error creating zip: ${err}` });
        });

        archive.pipe(output);

        // Add PDF files to the zip file
        outfiles.forEach((pdfFile, index) => {
          archive.file(pdfFile, {
            name: `${files[index].originalname.split(".")[0]}.xlsx`,
          });
        });

        archive.finalize();
      } else {
        const sourcePath = outfiles[0]; // Replace with the path to the source file
        const uploaded_docx = `${Date.now()}.xlsx`;
        const destinationPath = `./uploads/${uploaded_docx}`; // Replace with the path to the destination
        //delete origin file
        files.forEach(async (file) => {
          try {
            // Delete file from storage (assuming files are stored in a directory)
            fs.unlinkSync(`./temp_uploads/${file.filename}`);

            // Delete file from the database
            await Pdf.findByIdAndDelete(file._id);
            console.log(`File ${file.filename} deleted.`);
          } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
          }
        });

        // Move file from source directory to destination directory
        fs.rename(sourcePath, destinationPath, async (err) => {
          if (err) {
            console.error("Error moving file:", err);
          } else {
            console.log("File moved successfully!");
            const newPdf = Pdf.create({ name: uploaded_docx });

            res.send(uploaded_docx);
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

router.post("/pdf_to_word", upload2.array("files"), async (req, res) => {
  let files = req.files;
  pdfToWord(files)
    .then((outfiles) => {
      if (outfiles.length > 1) {
        const parentDirectory = path.join(__dirname, "../../uploads/"); // Parent directory path
        const directoryPath = "./temp_uploads/"; // temp_directory
        // Create a zip file in the parent directory
        const uploaded_zip = `${Date.now()}.zip`;
        const zipFileName = path.join(parentDirectory, uploaded_zip);
        const output = fs.createWriteStream(zipFileName);
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Compression level (0-9)
        });

        output.on("close", () => {
          fs.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Error reading directory:", err);
              return;
            }

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);

              fs.unlink(filePath, (err) => {
                if (err) {
                  console.error(`Error deleting file ${file}:`, err);
                } else {
                  console.log(`Deleted file: ${file}`);
                }
              });
            });
          });

          const newPdf = Pdf.create({ name: uploaded_zip });

          res.send(uploaded_zip);
        });

        archive.on("error", (err) => {
          res.status(500).send({ error: `Error creating zip: ${err}` });
        });

        archive.pipe(output);

        // Add PDF files to the zip file
        outfiles.forEach((pdfFile, index) => {
          archive.file(pdfFile, {
            name: `${files[index].originalname.split(".")[0]}.docx`,
          });
        });

        archive.finalize();
      } else {
        const sourcePath = outfiles[0]; // Replace with the path to the source file
        const uploaded_docx = `${Date.now()}.docx`;
        const destinationPath = `./uploads/${uploaded_docx}`; // Replace with the path to the destination
        //delete origin file
        files.forEach(async (file) => {
          try {
            // Delete file from storage (assuming files are stored in a directory)
            fs.unlinkSync(`./temp_uploads/${file.filename}`);

            // Delete file from the database
            await Pdf.findByIdAndDelete(file._id);
            console.log(`File ${file.filename} deleted.`);
          } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
          }
        });

        // Move file from source directory to destination directory
        fs.rename(sourcePath, destinationPath, async (err) => {
          if (err) {
            console.error("Error moving file:", err);
          } else {
            console.log("File moved successfully!");
            const newPdf = Pdf.create({ name: uploaded_docx });

            res.send(uploaded_docx);
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/latestBlogs", async (req, res) => {
  Blog.find()
    .sort({ uploadTime: -1 }) // Sort by createdAt in descending order
    .limit(3) // Limit the results to 3 items
    .exec((err, blogs) => {
      if (err) {
        res.status(400).json({ err: "not found blogs" });
        return;
      }
      res.json(blogs);
    });
});

router.get("/allBlogs", async (req, res) => {
  Blog.find()
    .sort({ uploadTime: -1 }) // Sort by createdAt in descending order
    .exec((err, blogs) => {
      if (err) {
        res.status(400).json({ err: "not found blogs" });
        return;
      }
      res.json(blogs);
    });
});

router.get("/blog/:url", async (req, res) => {
  const url = req.params.url;
  try {
    const blog = await Blog.findOne({
      url: { $regex: new RegExp(url, "i") },
    });
    const blogs = await Blog.find({}, "id url");

    res.json({ blog: blog, urls: blogs });
  } catch (err) {
    res.status(400).json({ error: [{ msg: "Server Error" }] });
    // Handle error
  }
});


// Function to clean up temporary files and directories
function cleanupTempFiles(outfiles, tempDirs, originFilePaths) {
  console.log(tempDirs)
  try {
    // Remove output files
    outfiles.forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    // Remove temporary directories
    tempDirs.forEach((dir) => {
      if (fs.existsSync(dir)) fsExtra.removeSync(dir); // Recursive deletion
    });

    originFilePaths.forEach((pdfPath) => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    });

    console.log("Temporary files and folders deleted successfully.");
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}


module.exports = router;
