const nodemailer = require("nodemailer");
const EmailTemplate = require("../models/EmailTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

/**
 * Send email using predefined templates
 * @param {string} userEmail - Recipient email
 * @param {string} type - Type of email (prequalification_pending, prequalification_approved)
 * @param {object} placeholders - Key-value pairs for template replacement
 */
async function sendPrequalificationEmail(userEmail, type, placeholders) {
  try {
    const template = await EmailTemplate.findOne({ type });

    if (!template) {
      throw new Error(`Email template for ${type} not found.`);
    }

    // Replace placeholders in subject and body
    let subject = template.subject;
    let body = template.body;

    Object.keys(placeholders).forEach((key) => {
      subject = subject.replace(new RegExp(`{${key}}`, "g"), placeholders[key]);
      body = body.replace(new RegExp(`{${key}}`, "g"), placeholders[key]);
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject,
      html: body,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userEmail} with type ${type}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
}

module.exports = { sendPrequalificationEmail };
