const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
  },
  resetToken: {
    type: String,
  },
  resetTokenExpiration: Date,
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
