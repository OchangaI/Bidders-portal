import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import errorMiddleware from "./middleware/errorMiddleware.js";
import "./utils/scheduler.js";

import cron from "node-cron";
import { loadInitialData } from "./controllers/tenderController.js";
import paypalRoutes from "./routes/paypalRoutes.js";
import Tender from "./models/Tender.js";
import axios from "axios";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import "./utils/cronJobs.js"; // Import the cron jobs

dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(express.json());
// app.use(cors({ origin: "https://biddersportal.com" })); 
app.use(cors({ origin: "http://localhost:3000" })); 
app.use(errorMiddleware);

// ✅ Store payment when user pays
app.post("/payment/success", async (req, res) => {
    try {
      const { userEmail, tenderRef, isSubscription, selectedCategories, selectedCountries, subscriptionType, endDate } = req.body;
  
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }
  
      console.log("✅ Payment Received for:", { userEmail, tenderRef, isSubscription });
  
      // 📌 If it's a tender purchase
      if (tenderRef) {
        const tender = await Tender.findOne({ BDR_No: Number(tenderRef) });
  
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }
  
        if (!tender.paidUsers.includes(userEmail)) {
          tender.paidUsers.push(userEmail);
          await tender.save();
        }
  
        const tenderEmailPayload = {
          recipient: userEmail,
          recipient_name: userEmail.split("@")[0], // Extract name
          subject: "Tender Purchase Confirmation",
          message: `
              <h2>Congratulations! 🎉</h2>
              <p>You have successfully purchased the tender:</p>
              <strong>${tender.Tender_Brief}</strong>
              <p>Country: ${tender.Country}</p>
              <p>Expiry Date: ${new Date(tender.Tender_Expiry).toDateString()}</p>
              <p><a href="${tender.FileUrl}" target="_blank">Download Tender Document</a></p>
              <p>Thank you for using our platform!</p>
          `,
        };
  
        console.log("📩 Sending Tender Purchase Email:", tenderEmailPayload);
  
        try {
          const tenderEmailResponse = await axios.post(
            "https://hazi.co.ke/api/v3/email/send",
            tenderEmailPayload,
            {
              headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` },
            }
          );
          console.log("✅ Tender Purchase Email Sent:", tenderEmailResponse.data);
        } catch (error) {
          console.error("❌ Tender Email Sending Failed:", error.response?.data || error.message);
        }
      }
  
      // 📌 If it's a subscription payment
      if (isSubscription) {
        const subscriptionEmailPayload = {
          recipient: userEmail,
          recipient_name: userEmail.split("@")[0], // Extract name
          subject: "Subscription Confirmation",
          message: `
              <h2>Thank You for Subscribing! 🎉</h2>
              <p>Your subscription details:</p>
              <ul>
                  <li><strong>Categories:</strong> ${selectedCategories?.join(", ") || "Not specified"}</li>
                  <li><strong>Countries:</strong> ${selectedCountries?.join(", ") || "Not specified"}</li>
                  <li><strong>Type:</strong> ${subscriptionType}</li>
                  <li><strong>Valid Until:</strong> ${new Date(endDate).toDateString()}</li>
              </ul>
              <p>You will start receiving daily tender notifications matching your preferences.</p>
              <p>Thank you for using our platform!</p>
          `,
        };
  
        console.log("📩 Sending Subscription Email:", subscriptionEmailPayload);
  
        try {
          const subscriptionEmailResponse = await axios.post(
            "https://hazi.co.ke/api/v3/email/send",
            subscriptionEmailPayload,
            {
              headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` },
            }
          );
          console.log("✅ Subscription Email Sent:", subscriptionEmailResponse.data);
        } catch (error) {
          console.error("❌ Subscription Email Sending Failed:", error.response?.data || error.toJSON());
        }
      }
  
      res.json({ message: "Payment recorded & email(s) sent", tenderRef, isSubscription });
    } catch (error) {
      console.error("❌ Error processing payment:", error.toJSON());
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

// ✅ API to fetch a tender by BDR_No
app.get("/tenders/:tenderRef", async (req, res) => {
  try {
    let { userEmail } = req.query; // Get email from query params
    const tenderRef = Number(req.params.tenderRef); // Convert to number

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    userEmail = decodeURIComponent(userEmail); // ✅ Decode URL-encoded email

    const tender = await Tender.findOne({ BDR_No: tenderRef });

    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    if (!tender.paidUsers.includes(userEmail)) {
      return res.status(403).json({ message: "Access denied. Please pay first." });
    }

    res.json(tender);
  } catch (error) {
    console.error("❌ Error fetching tender:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// API routes
import authRoutes from "./routes/authRoutes.js";
import tenderRoutes from "./routes/tenderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import preQualificationRoutes from "./routes/preQualificationRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";

app.use(cors({ origin: process.env.FRONTEND_URL }));

app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paypalRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/prequalification", preQualificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
// app.use("/api/tenders/purchased", purchasedTendersRoutes);

// ✅ Schedule the tender import to run every 24 hours (midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("⏳ Starting scheduled tender import...");
  await loadInitialData();
});

// ✅ Database Connection and Server Start
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Load initial data
    await loadInitialData();

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
  }
};

startServer();
