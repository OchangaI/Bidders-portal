import express from "express";
import axios from "axios";
import PreQualification from "../models/PreQualification.js";

import { verifyAdmin } from "../middleware/adminMiddleware.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Function to send prequalification email
const sendPrequalificationEmail = async (to, type, variables) => {
  console.log(`Sending email to ${to} with type ${type} and variables ${JSON.stringify(variables)}`);

  // Define custom templates
  const templates = {
    Supplier: {
      prequalification_pending: {
        subject: "Your Supplier Pre-Qualification Request is Pending",
        body: "Dear {{companyName}},\n\nYour supplier pre-qualification request is currently pending. We will notify you once it is reviewed.\n\nThank you.",
      },
      prequalification_approved: {
        subject: "Your Supplier Pre-Qualification Request is Approved",
        body: "Dear {{companyName}},\n\nCongratulations! Your supplier pre-qualification request has been approved.\n\nThank you.",
      },
    },
    Client: {
      prequalification_pending: {
        subject: "Your Client Pre-Qualification Request is Pending",
        body: "Dear {{companyName}},\n\nYour client pre-qualification request is currently pending. We will notify you once it is reviewed.\n\nThank you.",
      },
      prequalification_approved: {
        subject: "Your Client Pre-Qualification Request is Approved",
        body: "Dear {{companyName}},\n\nCongratulations! Your client pre-qualification request has been approved.\n\nThank you.",
      },
    },
    // Add more templates as needed
  };

  const template = templates[type]?.prequalification_pending;
  if (!template) {
    console.error(`Email template not found for type: ${type}`);
    throw new Error("Email template not found");
  }

  const message = template.body.replace(/{{(\w+)}}/g, (_, key) => variables[key] || "");

  await axios.post(
    "https://hazi.co.ke/api/v3/email/send",
    {
      recipient: to,
      subject: template.subject,
      message,
    },
    { headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` } }
  );
};

// ✅ Process Pre-Qualification Submission & Payment
router.post("/submit", async (req, res) => {
  try {
    const {
      type,
      companyName,
      companyType,
      country,
      location,
      phoneNumber,
      categoriesOfInterest,
      supplyLocations,
      emailAddress,
      websiteOrSocialMedia,
      pin,
      amountPaid,
      currency,
    } = req.body;

    // ✅ Validate Input
    if (!companyName || !emailAddress || !phoneNumber || !pin) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Create Payment Request to Flutterwave
    const tx_ref = `prequal_${Date.now()}`;
    const paymentResponse = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref,
        amount: amountPaid,
        currency,

        redirect_url: 'https://biddersportal.com/prequalification-success',
        // redirect_url: 'http://localhost:3000/prequalification-success',

        redirect_url: `${process.env.FRONTEND_URL}/prequalification-success`,

        customer: { email: emailAddress, phone_number: phoneNumber, name: companyName },
        customizations: {
          title: `${type} Pre-Qualification`,
          description: `Payment for ${type} pre-qualification`,
          logo: `${process.env.FRONTEND_URL}/logo.png`,
        },
      },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    if (!paymentResponse.data || paymentResponse.data.status !== "success") {
      return res.status(400).json({ message: "Payment initiation failed" });
    }

    // ✅ Save "Pending" Pre-Qualification Entry
    const preQualification = new PreQualification({
      type,
      companyName,
      companyType,
      country,
      location,
      phoneNumber,
      categoriesOfInterest,
      supplyLocations,
      emailAddress,
      websiteOrSocialMedia,
      pin,
      amountPaid,
      currency,
      paymentStatus: "Pending",
      transactionId: tx_ref,
    });

    await preQualification.save();

    // ✅ Return Payment Link
    res.json({
      message: "Payment initiated successfully",
      paymentLink: paymentResponse.data.data.link,
    });

    // Send prequalification email
    try {
      await sendPrequalificationEmail(emailAddress, type, { companyName, type });
    } catch (emailError) {
      console.error("Error sending prequalification email:", emailError);
    }

  } catch (error) {
    console.error("Error processing pre-qualification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Update prequalification request status and send notification emails
 */
router.put("/update-status", async (req, res) => {
  try {
    const { requestId, status } = req.body;

    const updatedRequest = await PreQualification.findByIdAndUpdate(
      requestId,
      { $set: { status } }, // Ensure status is explicitly set
      { new: true, upsert: true } // upsert ensures the field is added if missing
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Confirm Payment & Update Status
router.post("/confirm-payment", async (req, res) => {
  try {
    const { transactionId } = req.body;

    // ✅ Verify Payment with Flutterwave
    const verifyResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    if (!verifyResponse.data || verifyResponse.data.status !== "success") {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // ✅ Update Pre-Qualification Status
    const preQualification = await PreQualification.findOneAndUpdate(
      { transactionId },
      { paymentStatus: "Paid" },
      { new: true }
    );

    if (!preQualification) {
      return res.status(404).json({ message: "Pre-qualification record not found" });
    }

    // ✅ Send Confirmation Email
    await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: preQualification.emailAddress,
        recipient_name: preQualification.companyName,
        subject: `${preQualification.type} Pre-Qualification Confirmation`,
        message: `
          <h2>Congratulations! 🎉</h2>
          <p>You have successfully completed your ${preQualification.type} pre-qualification.</p>
          <p><strong>Company:</strong> ${preQualification.companyName}</p>
          <p><strong>Country:</strong> ${preQualification.country}</p>
          <p><strong>Categories of Interest:</strong> ${preQualification.categoriesOfInterest.join(", ")}</p>
          <p><strong>Amount Paid:</strong> ${preQualification.currency} ${preQualification.amountPaid}</p>
          <p>Thank you for using our platform!</p>
        `,
      },
      { headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` } }
    );

    res.json({ message: "Payment confirmed & email sent" });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Get all prequalification requests
router.get("/", async (req, res) => {
  try {
    const requests = await PreQualification.find().sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching prequalification requests", error });
  }
});

// Get a specific prequalification request by ID
router.get("/:id", async (req, res) => {
  try {
    const request = await PreQualification.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Prequalification request not found" });
    }
    res.status(200).json(request);
  } catch (error) {
        res.status(500).json({ message: "Error fetching prequalification request", error });
      }
    });

// ✅ Fetch User Pre-Qualifications
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const preQualifications = await PreQualification.find({ emailAddress: email, paymentStatus: "Paid" });
    res.json(preQualifications);
  } catch (error) {
    console.error("Error fetching pre-qualifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
