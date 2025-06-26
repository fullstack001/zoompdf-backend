const mongoose = require("mongoose");

const PdfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uploadTime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Pdf = mongoose.model("pdf", PdfSchema);
