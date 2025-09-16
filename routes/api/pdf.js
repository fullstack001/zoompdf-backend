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
const pdfToJpg = require("../../controller/pdf-jpg");
const pdfToPng = require("../../controller/pdf-png");
const pdfToEpub = require("../../controller/pdf-epub");
const epubToPdf = require("../../controller/epub-pdf");
const excelToPdf = require("../../controller/excel-pdf");
const jpgToPdf = require("../../controller/jpg-pdf");
const protectPdf = require("../../controller/protect-pdf");
const unlockPdf = require("../../controller/unlock-pdf");
const splitPdf = require("./splitPdf");
const auth = require("../../middleware/auth");

const Pdf = require("../../models/Pdf");
const Clients = require("../../models/Clients");
const Blog = require("../../models/Blog");
const ProcessingFile = require("../../models/ProcessingFile");

// ==================== MULTER CONFIGURATIONS ====================
const createMulterStorage = (destination, fileExtension) => {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      const extension = fileExtension || path.extname(file.originalname);
      cb(null, file.originalname);
    }
  });
};

const storage = createMulterStorage("uploads/", ".pdf");
const storage1 = createMulterStorage("uploads/", ".zip");
const storage2 = createMulterStorage("temp_uploads/", ".pdf");
const storage3 = createMulterStorage("temp_uploads/", ".docx");
const storage4 = createMulterStorage("temp_uploads/", (req, file) => "." + file.mimetype.split("/")[1]);

const upload = multer({ storage });
const upload1 = multer({ storage: storage1 });
const upload2 = multer({ storage: storage2 });
const upload3 = multer({ storage: storage3 });
const upload4 = multer({ storage: storage4 });

// ==================== UTILITY FUNCTIONS ====================
const fileUtils = {
  /**
   * Clean up temporary files and directories
   */
  cleanupTempFiles: (outfiles, tempDirs, originFilePaths) => {
    try {
      outfiles.forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });

      tempDirs.forEach(dir => {
        if (fs.existsSync(dir)) fsExtra.removeSync(dir);
      });

      originFilePaths.forEach(pdfPath => {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      });

      console.log("Temporary files and folders deleted successfully.");
    } catch (err) {
      console.error("Error during cleanup:", err);
    }
  },

  /**
   * Clean up temp_uploads directory
   */
  cleanupTempUploads: () => {
    const directoryPath = "./temp_uploads/";
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        console.error("Error reading directory:", err);
        return;
      }

      files.forEach(file => {
        const filePath = path.join(directoryPath, file);
        fs.unlink(filePath, err => {
          if (err) {
            console.error(`Error deleting file ${file}:`, err);
          }
        });
      });
    });
  },

  /**
   * Delete original uploaded files
   */
  deleteOriginalFiles: async (files) => {
    for (const file of files) {
      try {
        fs.unlinkSync(`./temp_uploads/${file.filename}`);
        await Pdf.findByIdAndDelete(file._id);
        console.log(`File ${file.filename} deleted.`);
      } catch (error) {
        console.error(`Error deleting file ${file.filename}:`, error);
      }
    }
  },

  /**
   * Get file size
   */
  getFileSize: async (filePath) => {
    return await fileSize(filePath);
  }
};

// ==================== FILE PROCESSING FUNCTIONS ====================
const fileProcessing = {
  /**
   * Handle single file processing
   */
  handleSingleFile: async (outfiles, req, res, fileExtension = "pdf") => {
    const sourcePath = outfiles[0];
    const uploadedFile = `${req.files[0].originalname?.split(".")[0]}_${Date.now()}.${fileExtension}`;
    const destinationPath = `./uploads/${uploadedFile}`;

    try {
      await fileUtils.deleteOriginalFiles(req.files);
      
      fs.rename(sourcePath, destinationPath, async (err) => {
        if (err) {
          console.error("Error moving file:", err);
          return res.status(500).send({ error: "Error moving file" });
        }
        
        console.log("File moved successfully!");
        const newPdf = await Pdf.create({ name: uploadedFile });
        
        if (fileExtension === "pdf") {
          const size = await fileUtils.getFileSize(`./uploads/${uploadedFile}`);
          res.send({ file: uploadedFile, reSize: size });
        } else {
          res.send(uploadedFile);
        }
      });
    } catch (error) {
      console.error("Error in single file processing:", error);
      res.status(500).send({ error: "Error processing file" });
    }
  },

  /**
   * Handle multiple files processing with ZIP creation
   */
  handleMultipleFiles: async (outfiles, req, res, fileExtension = "pdf") => {
    const parentDirectory = path.join(__dirname, "../../uploads/");
    const uploadedZip = `${req.files[0].originalname?.split(".")[0]}_${Date.now()}.zip`;
    const zipFileName = path.join(parentDirectory, uploadedZip);
    
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", async () => {
      fileUtils.cleanupTempUploads();
      const newPdf = await Pdf.create({ name: uploadedZip });
      
      if (fileExtension === "pdf") {
        const size = await fileUtils.getFileSize(`./uploads/${uploadedZip}`);
        res.send({ file: uploadedZip, reSize: size });
      } else {
        res.send(uploadedZip);
      }
    });

    archive.on("error", (err) => {
      res.status(500).send({ error: `Error creating zip: ${err}` });
    });

    archive.pipe(output);

    outfiles.forEach((file, index) => {
      const fileName = `${req.files[index].originalname.split(".")[0]}.${fileExtension}`;
      archive.file(file, { name: fileName });
    });

    await archive.finalize();
  },

  /**
   * Process files and handle single/multiple file scenarios
   */
  processFiles: async (outfiles, req, res, fileExtension = "pdf") => {
    if (outfiles.length > 1) {
      await fileProcessing.handleMultipleFiles(outfiles, req, res, fileExtension);
    } else {
      await fileProcessing.handleSingleFile(outfiles, req, res, fileExtension);
    }
  }
};

// ==================== PDF UPLOAD ENDPOINTS ====================
router.post("/pdf_upload", upload.single("pdf"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }

    await Pdf.create({ name: uploadedFile.filename });
    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error("error: " + error);
    res.status(500).send("Error processing file");
  }
});

router.post("/edited_pdf_upload", upload.single("files"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }

    await Pdf.create({ name: uploadedFile.filename });
    
    const deletes = req.body.deletes;
    const files = deletes.split(",");
    console.log(files);

    files.forEach(file => {
      const filePath = path.join("./uploads/", file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file ${file}:`, err);
        } else {
          console.log(`Deleted file: ${file}`);
        }
      });
    });

    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

router.post("/png_upload", upload4.array("files"), async (req, res) => {
  try {
    const files = req.files;
    res.status(200).send(files);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

router.post("/zip_upload", upload1.single("file"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).send("No file uploaded");
    }
    
    await Pdf.create({ name: uploadedFile.filename });
    res.status(200).send(uploadedFile.filename);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing file");
  }
});

// ==================== EDIT SIGN PDF ENDPOINT ====================
router.post("/edit-sign-upload", upload2.single("file"), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const { action, email, isSign } = req.body;
    
    // Validate required fields
    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    if (!action ) {
      return res.status(400).json({ 
        error: "Missing required fields: action is required" 
      });
    } 
    
    
    // Create ProcessingFile record
    const processingFile = await ProcessingFile.create({
      email: email,
      filename: uploadedFile.filename,
      originFile: uploadedFile.path,
      action: action,
      isSign: isSign,
      status: 'pending'
    });
    
    console.log(`Processing file created: ${processingFile._id}`);
    
    res.status(200).json({
      message: "File uploaded successfully and queued for processing",
      processingId: processingFile._id,
      filename: uploadedFile.filename,
      status: 'pending'
    });
    
  } catch (error) {
    console.error("Error in edit-sign-pdf endpoint:", error);
    
    // Clean up uploaded file if database save failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up uploaded file:", cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: "Error processing file upload",
      details: error.message 
    });
  }
});

// ==================== FILE MANAGEMENT ENDPOINTS ====================
router.get("/delete/:file", (req, res) => {
  console.log(req.params.file);
  const filePath = `uploads/${req.params.file}`;
  
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send(err);
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

router.post("/download", auth, async (req, res) => {
  const { fileName, action, user } = req.body;
  console.log(req.body);
  
  await Pdf.findOneAndUpdate(
    { name: fileName }, 
    { user: user, action: action }, 
    { new: true }
  );
  
  const filePath = `./uploads/${fileName}`;

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("File not existing");
    }
  });
});

router.delete("/delete-by-filename/:fileName", auth, async (req, res) => {
  const fileName = req.params.fileName;
  fs.unlinkSync(`./uploads/${fileName}`);
  await Pdf.findOneAndDelete({ name: fileName });
  res.status(200).send("File deleted successfully");
});

router.get("/files", auth, async (req, res) => {
  try {
    const responseUser = req.user.user;
    console.log(responseUser);

    if (responseUser.isAdmin) {
      const allFiles = await Pdf.find();
      return res.status(200).send(allFiles);
    } else {
      const userFiles = await Pdf.find({ user: responseUser.id });
      return res.status(200).send(userFiles);
    }
  } catch (err) {
    console.error("Error fetching files:", err);
    return res.status(500).send("Server Error");
  }
});

router.get("/time/:name", async (req, res) => {
  console.log(req.params.name);
  try {
    const data = await Pdf.findOne({ name: req.params.name });
    res.status(200).send(data.uploadTime);
  } catch (err) {
    res.status(500).send("File not found");
  }
});

// ==================== PDF SPLIT ENDPOINT ====================
router.post("/pdf_split", upload2.single("file"), async (req, res) => {
  try {
    const items = JSON.parse(req.body.items);
    const { merge_flag, pages } = items;
    const file = req.file;
    
    const data = await fs.promises.readFile(`temp_uploads/${file.filename}`);
    const readPdf = await PDFDocument.load(data);
    
    const outFiles = await splitPdf(readPdf, pages, merge_flag, file.filename);
    const outfiles = await compressFiles(outFiles, 100);
    
    if (outfiles.length > 1) {
      await fileProcessing.handleMultipleFiles(outfiles, req, res, "split");
    } else {
      await fileProcessing.handleSingleFile(outfiles, req, res, "split");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error processing PDF split" });
  }
});

// ==================== PDF COMPRESSION ENDPOINT ====================
router.post("/compress_pdf", upload2.array("files"), async (req, res) => {
  try {
    const level = req.body.level || 100;
    const files = req.files;
    const names = files.map(file => file.filename);
    
    const outfiles = await compressFiles(names, level);
    await fileProcessing.processFiles(outfiles, req, res, "pdf");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error compressing PDF" });
  }
});

// ==================== PDF PROTECTION ENDPOINT ====================
router.post("/protect_pdf", upload2.array("files"), async (req, res) => {
  try {
    const password = req.body.password;
    const files = req.files;
    
    const outfiles = await protectPdf(files, password);
    await fileProcessing.processFiles(outfiles, req, res, "pdf");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error protecting PDF" });
  }
});

// ==================== PDF UNLOCK ENDPOINT ====================
router.post("/unlock_pdf", upload2.array("files"), async (req, res) => {
  const files = req.files;
  const password = req.body.password || "";
  
  try {
    const outfile = await unlockPdf(files[0], password);
    const sourcePath = outfile;
    const uploadedPdf = `${req.files[0].originalname?.split(".")[0]}_${Date.now()}.pdf`;
    const destinationPath = `./uploads/${uploadedPdf}`;

    fs.rename(sourcePath, destinationPath, async (err) => {
      if (err) {
        console.error("Error moving file:", err);
        return res.status(500).send({ error: "Error moving unlocked PDF." });
      }

      try {
        await Promise.all(
          files.map(async (file) => {
            const tempFilePath = `./temp_uploads/${file.filename}`;
            await fs.promises.unlink(tempFilePath);
          })
        );

        const newPdf = await Pdf.create({ name: uploadedPdf });
        const size = await fileUtils.getFileSize(`./uploads/${uploadedPdf}`);
        res.send({ file: uploadedPdf, reSize: size });
      } catch (err) {
        console.error("Error cleaning up files or saving metadata:", err);
        res.status(500).send({
          error: "Error cleaning up files or saving metadata.",
        });
      }
    });
  } catch (error) {
    try {
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



// ==================== PDF TO IMAGE CONVERSION ENDPOINTS ====================
router.post("/pdf_to_jpg", upload2.array("files"), async (req, res) => {
  try {
    const level = req.body.level || "page";
    const files = req.files;
    const fileNames = files.map(file => file.filename);
    
    const { outfiles, tempDirs } = await pdfToJpg(fileNames, level);
    
    if (outfiles.length > 1) {
      const uploadedZip = `${files[0].originalname?.split(".")[0]}_${Date.now()}.zip`;
      const zipFileName = path.join(__dirname, "../../uploads/", uploadedZip);
      
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", async () => {
        fileUtils.cleanupTempFiles(outfiles, tempDirs, []);
        await Pdf.create({ name: uploadedZip });
        res.send(uploadedZip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      outfiles.forEach((file, index) => {
        const fileName = `pdfden_convert_${index}.jpg`;
        archive.file(file, { name: fileName });
      });

      await archive.finalize();
    } else {
      const sourcePath = outfiles[0];
      const uploadedJpg = `${files[0].originalname?.split(".")[0]}_${Date.now()}.jpg`;
      const destinationPath = path.join(__dirname, "../../uploads/", uploadedJpg);

      fs.renameSync(sourcePath, destinationPath);
      fileUtils.cleanupTempFiles(outfiles, tempDirs, []);

      await Pdf.create({ name: uploadedJpg });
      res.send(uploadedJpg);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to JPG" });
  }
});

router.post("/pdf_to_png", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const fileNames = files.map(file => file.filename);
    
    const { outfiles, tempDirs } = await pdfToPng(fileNames);
    
    if (outfiles.length > 1) {
      const uploadedZip = `${files[0].originalname?.split(".")[0]}_${Date.now()}.zip`;
      const zipFileName = path.join(__dirname, "../../uploads/", uploadedZip);
      
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", async () => {
        fileUtils.cleanupTempFiles(outfiles, tempDirs, []);
        await Pdf.create({ name: uploadedZip });
        res.send(uploadedZip);
      });

      archive.on("error", (err) => {
        res.status(500).send({ error: `Error creating zip: ${err}` });
      });

      archive.pipe(output);

      outfiles.forEach((file, index) => {
        const fileName = `pdfden_convert_${index}.png`;
        archive.file(file, { name: fileName });
      });

      await archive.finalize();
    } else {
      const sourcePath = outfiles[0];
      const uploadedPng = `${files[0].originalname?.split(".")[0]}_${Date.now()}.png`;
      const destinationPath = path.join(__dirname, "../../uploads/", uploadedPng);

      fs.renameSync(sourcePath, destinationPath);
      fileUtils.cleanupTempFiles(outfiles, tempDirs, []);

      await Pdf.create({ name: uploadedPng });
      res.send(uploadedPng);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to PNG" });
  }
});

// ==================== PRESENTATION CONVERSION ENDPOINTS ====================
router.post("/pptx_to_pdf", upload3.array("files"), async (req, res) => {
  try {
    const degree = req.body.degrees.split(",");
    const files = req.files;
    
    const outfiles = await pptToPdf(files, degree);
    await fileProcessing.processFiles(outfiles, req, res, "pptx");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PPTX to PDF" });
  }
});

router.post("/pdf_to_pptx", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await pdfToPpt(files);
    await fileProcessing.processFiles(outfiles, req, res, "pptx");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to PPTX" });
  }
});

// ==================== IMAGE TO PDF CONVERSION ENDPOINT ====================
router.post("/jpg_to_pdf", upload4.array("files"), async (req, res) => {
  try {
    const { direction, pageSize, margin, merge_selected } = req.body;
    const files = req.files;
    console.log(files);
    
    const outfiles = await jpgToPdf(files, direction, pageSize, margin, merge_selected);
    await fileProcessing.processFiles(outfiles, req, res, "pdf");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting JPG to PDF" });
  }
});

// ==================== EXCEL CONVERSION ENDPOINTS ====================
router.post("/excel-to-pdf", upload3.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await excelToPdf(files);
    await fileProcessing.processFiles(outfiles, req, res, "pdf");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting Excel to PDF" });
  }
});

router.post("/pdf_to_excel", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await pdfToExcel(files);
    await fileProcessing.processFiles(outfiles, req, res, "xlsx");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to Excel" });
  }
});

// ==================== WORD CONVERSION ENDPOINTS ====================
router.post("/word_to_pdf", upload3.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await wordToPdf(files, 0);
    await fileProcessing.processFiles(outfiles, req, res, "docx");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting Word to PDF" });
  }
});

router.post("/pdf_to_word", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await pdfToWord(files);
    await fileProcessing.processFiles(outfiles, req, res, "docx");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to Word" });
  }
});

// ==================== EPUB CONVERSION ENDPOINTS ====================
router.post("/pdf_to_epub", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await pdfToEpub(files);
    await fileProcessing.processFiles(outfiles, req, res, "epub");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting PDF to EPUB" });
  }
});

router.post("/epub_to_pdf", upload2.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const outfiles = await epubToPdf(files);
    await fileProcessing.processFiles(outfiles, req, res, "epub");
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error converting EPUB to PDF" });
  }
});

// ==================== BLOG ENDPOINTS ====================
router.get("/latestBlogs", async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ uploadTime: -1 })
      .limit(3)
      .exec();
    res.json(blogs);
  } catch (err) {
    res.status(400).json({ err: "not found blogs" });
  }
});

router.get("/allBlogs", async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ uploadTime: -1 })
      .exec();
    res.json(blogs);
  } catch (err) {
    res.status(400).json({ err: "not found blogs" });
  }
});

router.get("/blog/:url", async (req, res) => {
  try {
    const url = req.params.url;
    const blog = await Blog.findOne({
      url: { $regex: new RegExp(url, "i") },
    });
    const blogs = await Blog.find({}, "id url");

    res.json({ blog: blog, urls: blogs });
  } catch (err) {
    res.status(400).json({ error: [{ msg: "Server Error" }] });
  }
});

module.exports = router;
