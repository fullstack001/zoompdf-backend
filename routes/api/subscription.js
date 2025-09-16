const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const moment = require("moment");
const normalize = require("normalize-url");

const User = require("../../models/User");
const Subscription = require("../../models/Subscription");

const jwtSecret = process.env.JWT_SECRET || "default_secret_key";
const router = express.Router();
dotenv.config();

const stripe_secret_key = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripe_secret_key);

const generateToken = (user, subscription, expiresIn = "3d") => {
  const payload = {
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
    },
    subscription,
  };
  return new Promise((resolve, reject) => {
    jwt.sign(payload, jwtSecret, { expiresIn }, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

router.post("/create-stripe-subscription", async (req, res) => {
  const { name, email, paymentMethodId, priceId } = req.body;

  try {
    // 1. Create customer
    const customer = await stripe.customers.create({
      name,
      email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 2. Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // 3. Create subscription (automatic payment, no client_secret needed)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      payment_behavior: "allow_incomplete", // allow backend to confirm later if needed
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    if (paymentIntent && paymentIntent.status === "requires_action") {
      // This payment requires 3D Secure
      return res.status(400).json({ error: "3D Secure required", requires_action: true });
    }

    res.status(200).json({
      subscriptionId: subscription.id,
      status: subscription.status,
      message: "Subscription created successfully",
    });

  } catch (error) {
    console.error("Error creating subscription:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/add-subscription", async (req, res) => {
  try {
    const { email, plan, subscriptionType, subscriptionId } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscribedDate = new Date();
    const expiryDate =
      plan === "annual"
        ? moment(subscribedDate).add(1, "month").toDate()
        : moment(subscribedDate).add(7, "days").toDate();

    // Check if a subscription already exists for the user
    const existingSubscription = await Subscription.findOne({ user: user._id });
    if (existingSubscription) {
      // Update the existing subscription
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { user: user._id },
        {
          plan,
          subscribedDate,
          expiryDate,
          subscriptionType,
          subscriptionId,
        },
        { new: true } // Return the updated document
      );

      const token = await generateToken(user, updatedSubscription);


      return res.json({ token ,user, subscription: updatedSubscription });
    }

    // Create a new subscription if none exists
    const newSubscription = await Subscription.create({
      user: user._id,
      plan,
      subscribedDate,
      expiryDate,
      subscriptionType,
      subscriptionId,
    });

    // Create JWT token
    const token = await generateToken(user, newSubscription);

    res.json({ token, user, subscription: newSubscription });
  } catch (error) {
    console.error("Error adding subscription:", error);
    res.status(500).json({ error: "Failed to add subscription" });
  }
});

router.post("/cancel-subscription", async (req, res) => {
  const { subscriptionId, email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Cancel the subscription on Stripe
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);

    // Find and delete the subscription using the user's ID
    await Subscription.findOneAndDelete({ user: user._id, subscriptionId });

    // Return a success response
    res.status(200).json({
      message: "Subscription canceled successfully",
      deletedSubscription,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

module.exports = router;