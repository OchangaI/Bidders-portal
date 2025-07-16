import BiddingAssistance from "../models/BiddingAssistance.js";
import axios from "axios";
import dotenv from "dotenv";

/**
 * Send Confirmation Email using HAZI
 */
export const sendConfirmationEmail = async (email, name, details) => {
  try {
    await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: email,
        name: name,
        subject: "Bidding Assistance Request Received",
        message: `
          Hello ${name},

          Your bidding assistance request has been received.
          Our team will get back to you shortly.

          Details:
          ${details}

          Thank you for using our services.
          `,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Confirmation email sent to", email);
  } catch (error) {
    console.error("Error sending confirmation email:", error.response?.data || error.message);
  }
};

/**
 * Create Bidding Assistance Request (without payment verification)
 */
export const createBiddingRequest = async (req, res) => {
  try {
    const { name, email, details} = req.body;

    if (!name || !email || !details) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const newRequest = new BiddingAssistance({
      name,
      email,
      details,
    });

    await newRequest.save();
    await sendConfirmationEmail(email, name, details);

    return res.json({ success: true, message: "Bidding assistance request created" });
  } catch (error) {
    console.error("Error creating bidding assistance request:", error.message);
    res.status(500).json({ success: false, message: "Failed to create request", error: error.message });
  }
};

/**
 * Mark as Responded
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const updatedRequest = await BiddingAssistance.findByIdAndUpdate(
      requestId,
      { status: "Responded" },
      { new: true }
    );

    res.json({ success: true, message: "Request marked as Responded", request: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating status", error: error.message });
  }
};

/**
 * Delete Request
 */
export const deleteRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    await BiddingAssistance.findByIdAndDelete(requestId);
    res.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting request", error: error.message });
  }
};

/**
 * Get all Bidding Assistance Requests (For Admin)
 */
export const getRequests = async (req, res) => {
  try {
    const requests = await BiddingAssistance.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching requests", error: error.message });
  }
};

/**
 * Respond to a Bidding Assistance Request
 */
export const respondToRequest = async (req, res) => {
  try {
    const { requestId, responseMessage } = req.body;
    const updatedRequest = await BiddingAssistance.findByIdAndUpdate(
      requestId,
      { response: responseMessage, status: "responded" },
      { new: true }
    );

    res.json({ success: true, message: "Response sent", request: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error sending response", error: error.message });
  }
};

/**
 * Send Reply to User
 */
export const sendReply = async (req, res) => {
  const { email, name, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ success: false, message: "Missing email or message" });
  }

  try {
    const response = await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: email,
        name: name,
        subject: "Response to Your Bidding Assistance Request",
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status === "success") {
      return res.json({ success: true, message: "Reply sent successfully!" });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send email via HAZI" });
    }
  } catch (error) {
    console.error("HAZI Email API Error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Email sending failed", error: error.message });
  }
};
