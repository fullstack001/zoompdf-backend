const express = require("express");
const fetch = require("node-fetch");

const app = express();

// Endpoint to initiate Dropbox authentication
app.get("/auth/dropbox", (req, res) => {
  const clientId = "YOUR_DROPBOX_CLIENT_ID"; // Your Dropbox app's client ID
  const redirectUri = "YOUR_SERVER_REDIRECT_URI"; // Redirect URI registered with your Dropbox app

  // Redirect the user to Dropbox's authentication page
  res.redirect(
    `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`
  );
});

// Endpoint to handle the callback after successful Dropbox authentication
app.get("/auth/dropbox/callback", async (req, res) => {
  const code = req.query.code; // Authorization code received from Dropbox

  // Exchange the authorization code for an access token
  const accessTokenResponse = await fetch(
    "https://api.dropboxapi.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `code=${code}&grant_type=authorization_code&client_id=YOUR_DROPBOX_CLIENT_ID&client_secret=YOUR_DROPBOX_CLIENT_SECRET&redirect_uri=YOUR_SERVER_REDIRECT_URI`,
    }
  );

  const accessTokenData = await accessTokenResponse.json();
  const accessToken = accessTokenData.access_token; // Retrieve the access token from the response

  // Send the access token back to the frontend
  res.send({ accessToken });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
