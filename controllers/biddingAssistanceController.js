import BiddingAssistance from "../models/BiddingAssistance.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Email Setup
 */


const sendConfirmationEmail = async (email, name, details) => {
  try {
    const response = await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: email,
        name: name,
        subject: "Bidding Assistance Request Received",
        message: `Hello ${name},\n\nYour bidding assistance request has been received. Our team will get back to you shortly.\n\nDetails: ${details}\n\nThank you for using our services.`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`, // Use your HAZI API token
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status === "success") {
      console.log("Confirmation email sent to", email);
    } else {
      console.error("Failed to send confirmation email via HAZI:", response.data);
    }
  } catch (error) {
    console.error("Error sending confirmation email via HAZI:", error.response?.data || error.message);
  }
};

/**
 * Initiate Flutterwave Payment
 */
/**
 * Initiate Flutterwave Payment
 */
export const initiatePayment = async (req, res) => {
  try {
    const { name, email, details, amount, currency } = req.body;
    const tx_ref = `BA_${Date.now()}`;

    const paymentData = {
      tx_ref,
      amount,
      currency,
      redirect_url: `https://biddersportal.com/payment-success?tx_ref=${tx_ref}&email=${email}&name=${name}&details=${encodeURIComponent(details)}`,
      // redirect_url: `http://localhost:3000/payment-success?tx_ref=${tx_ref}&email=${email}&name=${name}&details=${encodeURIComponent(details)}`,
      customer: { email, name },
      customizations: { title: "Bidding Assistance Payment" },
    };

    const response = await axios.post("https://api.flutterwave.com/v3/payments", paymentData, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });

    if (response.data.status === "success") {
      res.json({ success: true, paymentLink: response.data.data.link });
    } else {
      res.status(400).json({ success: false, message: "Payment initiation failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error initiating payment", error: error.message });
  }
};

/**
 * Verify Flutterwave Payment & Create Request
 */
export const verifyPayment = async (req, res) => {
  const { tx_ref, transaction_id, email, name, details } = req.query;

  if (!transaction_id) {
    return res.status(400).json({ success: false, message: "Transaction ID is missing" });
  }

  try {
    console.log("🔍 Received query params:", req.query);

    const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });

    console.log("🌍 Flutterwave Response:", response.data);

    if (response.data.status === "success" && response.data.data.status === "successful") {
      const newRequest = new BiddingAssistance({
        name,
        email,
        details,
        amountPaid: response.data.data.amount,
        currency: response.data.data.currency,
        transactionId: transaction_id,
        paymentStatus: "successful",
      });

      await newRequest.save();
      await sendConfirmationEmail(email, name, details);

      return res.redirect("https://biddersportal.com/payment-success?status=success");
      // return res.redirect("http://localhost:3000/payment-success?status=success");
    } else {
      return res.redirect("https://biddersportal.com/payment-success?status=failed");
      // return res.redirect("http://localhost:3000/payment-success?status=failed");
    }
  } catch (error) {
    console.error("🚨 Error verifying payment:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Error verifying payment", error: error.message });
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
 * Get all bidding assistance requests (For admin)
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
 * Respond to a bidding assistance request
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
 * Send reply to user
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
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`, // Store API token in .env
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
