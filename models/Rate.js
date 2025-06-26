const mongoose = require("mongoose");

const RateSchema = new mongoose.Schema({
  rate: {
    type: Number,
    required: true,
  },
  comment: {
    type: String,
  },
  uploadTime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Rate = mongoose.model("rate", RateSchema);
