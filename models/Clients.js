const mongoose = require("mongoose");

const ClientsSchema = new mongoose.Schema({
  ip: String,
  browser: String,
  downUrl: String,
  workUrl: String,
  file: String,
  deleted: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("clients", ClientsSchema);
