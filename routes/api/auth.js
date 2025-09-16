const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const crypto = require("crypto");
const dotenv = require("dotenv");
const moment = require("moment");
const mg = require("mailgun-js");
const resetPasswordLink = require("../../config/mailTemplate").resetPasswordLink;
const auth = require("../../middleware/auth");
const normalize = require("normalize-url");

dotenv.config();
const jwtSecret = process.env.JWT_SECRET || "default_secret_key";

const User = require("../../models/User");
const Subscription = require("../../models/Subscription");

const router = express.Router();

const mailgun = mg({
  apiKey: process.env.MAILGUN_API_KEY || "",
  domain: process.env.MAILGUN_DOMAIN || "",
});

// Helper function to generate JWT token
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

// Helper function to fetch subscription
const fetchSubscription = async (userId) => {
  return await Subscription.findOne({ user: userId });
};

// @route    GET api/auth
// @desc     Get user by token
// @access   Private
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/changePassword", auth, async (req, res) => {
  const { email } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Password" });

    if (newPassword === oldPassword) {
      return res.status(400).json({ msg: "You are using this password now" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    const subscription = await fetchSubscription(user._id);
    const token = await generateToken(user, subscription, "1d");

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/register-email", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ msg: "Please provide a valid email" });
    }

    let user = await User.findOne({ email });
    if (user) {
      const subscription = await fetchSubscription(user._id);
      if (subscription) { 
        return res.status(409).json({ msg: "Email is already registered with a subscription" });
      } else {        
        return res.status(400).json({ user });
      }
    }
      

    const avatar = normalize(
      gravatar.url(email, { s: "200", r: "pg", d: "mm" }),
      { forceHttps: true }
    );

    user = new User({ email, avatar });
    await user.save();

    res.status(201).json({user});
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.password && password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
    } else if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "Invalid password" });
    }

    const subscription = await fetchSubscription(user._id);
    const token = await generateToken(user, subscription);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
      subscription,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get("/validate-token", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const subscription = await fetchSubscription(user._id);
    const token = await generateToken(user, subscription);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
      subscription,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "No user found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = moment().add(30, "minutes").toDate();

    user.resetToken = resetToken;
    user.resetTokenExpiration = resetTokenExpire;
    await user.save();

    const htmlContent = resetPasswordLink(user.fullName, resetToken);

    const data = {
      from: `PDFEZY Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Password Reset Request",
      html: htmlContent,
    };

    mailgun.messages().send(data, (error, body) => {
      if (error) {
        return res.status(500).json({ msg: "Failed to send email" });
      }
      res.json({ msg: "Reset link sent to your email" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();
    res.json({ msg: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});
module.exports = router;
