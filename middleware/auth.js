const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();


dotenv.config();
const jwtSecret = process.env.JWT_SECRET || "default_secret_key";

module.exports = function (req, res, next) {
  // Get token from header
  let token = req.headers.authorization;

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Remove 'Bearer ' if present
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length).trim();
  }
  // Verify token
  try {
    jwt.verify(token, jwtSecret, (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: "Token is not valid" });
      } else {
        req.user = decoded;
        next();
      }
    });
  } catch (err) {
    console.error("Something is wrong with auth middleware");
    res.status(500).json({ msg: "Server Error" });
  }
  // Verity token
  // try {
  //   const decoded = jwt.verify(token, config.get('jwtSecret'));

  //   req.user = decoded.user;
  //   next();
  // } catch (err) {
  //   console.error(err.message);
  //   res.status(401).json({ msg: 'Token is not valid' });
  // }
};
