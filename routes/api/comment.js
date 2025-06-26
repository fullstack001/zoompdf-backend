const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Rate = require("../../models/Rate");

// @route    POST comment/rate
// @desc     set rate user
// @access   Public

router.post("/rate", (req, res) => {
  console.log(req.body);
  const rate = new Rate({
    rate: req.body.rate,
    comment: req.body.comment,
  });
  rate
    .save()
    .then((rate) => {
      res.json({ rate });
    })
    .catch((err) => res.status(500).send("Server error"));
});

module.exports = router;
