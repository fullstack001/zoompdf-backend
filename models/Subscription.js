const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: { type: String, required: true },
  subscriptionType: {
    type: String,
    enum: ["stripe", "paypal"],
  },
  subscriptionId: { type: String },
  subscribedDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, required: true },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
