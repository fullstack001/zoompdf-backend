const mongoose = require("mongoose");

const ProcessingFileSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  filename: {
    type: String,
    required: true,
  },
  originFile: {
    type: String,
    required: true,
  },
  completedFile: {
    type: String,
    default: null,
  },
  action: {
    type: String,
    required: true,
  },
  isSign: {
    type: Boolean,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  uploadTime: {
    type: Date,
    default: Date.now,
  },
  completedTime: {
    type: Date,
    default: null,
  },
});

module.exports = ProcessingFile = mongoose.model("processingfile", ProcessingFileSchema);
