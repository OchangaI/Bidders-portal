import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // Change if using a different provider
  auth: {
    user: process.env.EMAIL_USER, // Ensure this is set in your environment variables
    pass: process.env.EMAIL_PASS, // Ensure this is set in your environment variables
  },
});

/**
 * @desc Send an email
 * @param {string} recipient - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} content - Email body (HTML supported)
 * @returns {Promise<void>}
 */
const sendEmail = async (recipient, subject, content) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject,
      html: content, // HTML content support
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}: ${subject}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
};

export default sendEmail;
