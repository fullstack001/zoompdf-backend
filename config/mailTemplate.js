const dotenv = require("dotenv");

dotenv.config();

const style = `<style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f3f4f6;
                    margin: 0;
                    padding: 0;
                }

                .email-container {
                    background-color: #fefefe;
                    margin: 20px auto;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                }

                .button {
                    display: inline-block;
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    text-align: center;
                    text-decoration: none;
                    outline: none;
                    color: #fff !important;
                    background-color: #007bff;
                    border: none;
                    border-radius: 5px;
                    box-shadow: 0 4px #999;
                }
                .ii a[href] {
                    color: #fff;
                }

                .button:hover {background-color: #0069d9}

                .button:active {
                    background-color: #0069d9;
                    box-shadow: 0 2px #666;
                    transform: translateY(2px);
                }
                a {
                    color:#fff
                }

                p {
                    font-size: 16px;
                    color: #333;
                }
                ul{
                    font-size: 16px;
                    color: #333;
                }
            </style>`;

function validationCodeContent(userName, code) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://pdfezy.com/watermark.png" alt="PDFEZY Logo" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>Welcome to <strong>PDFEZY</strong>! We're thrilled to have you on board.</p>
                    <p>To complete your setup, please verify your email using the code below:</p>
                    <div class="button">${code}</div>
                    <p>Once verified, you'll get instant access to:</p>
                    <ul>
                     <li>AI-powered interactive avatars</li>
                     <li>Automated social media and email campaigns</li>
                     <li>Advanced analytics and insights</li>
                    </ul>
                    <p>If you have any questions, reach us at:</p>
                    <p><strong>support@PDFEZY.com</strong></p>
                    <p>We're excited to help you get started!</p>
                    <p>Best regards,<br>
                    The PDFEZY Team</p>
                </div>
            </body>
            </html>`;
}

function subscriptionConfirmationContent(userName, plan, expirationDate) {
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://pdfezy.com/watermark.png" alt="PDFEZY Logo" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>Thank you for subscribing to <strong>pdfezy</strong>!</p>
                    <p>We're excited to have you on board with the <strong>${plan}</strong> plan.</p>
                    <p>Your subscription is valid until <strong>${expirationDate}</strong>.</p>
                    <p>If you have any questions or need assistance, don't hesitate to reach out to our support team at:</p>
                    <p><strong>support@pdfezy.com</strong></p>
                    <p>We're here to ensure you get the most out of your experience!</p>
                    <p>Best regards,<br>The pdfezy Team</p>
                </div>
            </body>
            </html>`;
}

function resetPasswordLink(userName, token) {
  const resetLink = `https://pdfezy.com/reset-password?token=${token}`;
  return `<!DOCTYPE html>
            <html>
            <head>
                ${style}
            </head>
            <body>
                <div class="email-container">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://pdfezy.com/watermark.png" alt="PDFEZY Logo" style="max-width: 200px; height: auto;"/>
                    </div>
                    <p>Dear ${userName},</p>
                    <p>We received a request to reset your  account password. If you made this request, please click the link below to reset your password:</p>
                    <a href="${resetLink}" class="button">Reset Password</a>
                    <p>For your security, this link will expire in 24 hours. If you didn’t request a password reset, you can safely ignore this email—your account will remain secure.</p>
                    <ul>
                     <li>AI-powered interactive avatars</li>
                     <li>Automated social media and email campaigns</li>
                     <li>Advanced analytics and insights</li>
                    </ul>
                    <p>If you have any questions, reach us at:</p>
                    <p><strong>support@pdfezy.com</strong></p>
                    <p>We're excited to help you get started!</p>
                    <p>Best regards,<br>
                    The PDFEZY Team</p>
                </div>
            </body>
            </html>`;
}

module.exports = {
  validationCodeContent,
  subscriptionConfirmationContent,
  resetPasswordLink,
};

