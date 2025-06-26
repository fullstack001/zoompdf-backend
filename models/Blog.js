const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  img: {
    type: String,
  },
  content: {
    type: String,
  },
  available: {
    type: Boolean,
    default: true,
  },
  metaData: {
    type: Object,
  },
  uploadTime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Blog = mongoose.model("blog", BlogSchema);
