const bcrypt = require("bcryptjs");
const User = require("../models/User");
const gravatar = require("gravatar");
const normalize = require("normalize-url");

async function createAdmin() {
  const name = "Admin";
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("123456", salt);
  const email = "test@admin.com";

  const avatar = normalize(
    gravatar.url(email, {
      s: "200",
      r: "pg",
      d: "mm",
    }),
    { forceHttps: true }
  );

  // Check if admin user exists, if not, create one
  User.findOne({ name: name }, async (err, existingAdmin) => {
    if (err) {
      console.error(err);
      return;
    }

    if (!existingAdmin) {
      // Encrypt the password

      // Create admin user
      adminUser = new User({
        name: name,
        email: email,
        password: password,
        avatar: avatar,
        isAdmin: 1,
      });

      adminUser.save((err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Admin user created successfully.");
      });
    } else {
      console.log("Admin user already exists.");
    }
  });
}

module.exports = createAdmin;
