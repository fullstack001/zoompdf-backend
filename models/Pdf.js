const mongoose = require("mongoose");

const PdfSchema = new mongoose.Schema({
  user: {
    type: String,
  },
  action: {
    type: String,
  },
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
