const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

const jwtSecret = process.env.JWT_SECRET || "default_secret_key";

const User = require("../../models/User");

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

// @route    POST api/auth
// @desc     Authenticate user & get token
// @access   Public
router.post(
  "/",
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid Password" });
      }

      const payload = {
        user: {
          name: user.name,
          id: user._id,
          email: user.email,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
        },
      };

      jwt.sign(payload, jwtSecret, { expiresIn: "1 days" }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post("/changePassword", auth, async (req, res) => {
  const { email } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    let user = await User.findOne({ email });

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Password" });
    }

    if (newPassword == oldPassword) {
      return res.status(400).json({ msg: "You are using this password now" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    const payload = {
      user: {
        name: user.name,
        id: user._id,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    };

    jwt.sign(payload, jwtSecret, { expiresIn: "1 days" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
