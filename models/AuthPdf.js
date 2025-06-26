const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AuthPdfSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  name: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = AuthPdf = mongoose.model("authPdf", AuthPdfSchema);
