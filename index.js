import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import errorMiddleware from "./middleware/errorMiddleware.js";
import "./utils/scheduler.js";
import { loadInitialData } from "./controllers/tenderController.js";
import paypalRoutes from "./routes/paypalRoutes.js";
import Tender from "./models/Tender.js";
import axios from "axios";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import "./utils/cronJobs.js"; // Import the cron jobs
import { sendDailyNotifications } from "./controllers/subscriptionController.js";
import IntaSend from "intasend-node"; // Import IntaSend SDK
import "./utils/dailyNotifier.js"; // place after your DB connection is ready

// import notificationRoutes from "./routes/notificationRoutes.js";


import cron from "node-cron";

dotenv.config(); // Load environment variables


const router = express.Router();

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://cbdbitjcgjlvcezcnojh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZGJpdGpjZ2psdmNlemNub2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY5OTAwMCwiZXhwIjoyMDUzMjc1MDAwfQ.VZMhsfJucljLP0IfxVZwbel5oYVLkWnHI9To3zo9O24'
const supabase = createClient(supabaseUrl, supabaseKey)

const app = express();

// Middleware
app.use(express.json());
const allowedOrigins = [
  'http://localhost:3000',  // Frontend
  'http://localhost:5173',  // Admin Dashboard
  'https://biddersportal.com',  // Deployed Frontend
  'https://admin.biddersportal.com',  // Deployed Admin Dashboard
  'https://fd18-129-222-187-197.ngrok-free.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // Dynamically set the correct origin
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(errorMiddleware);

// Fetch Admin Profile
router.get('/admin/profile', async (req, res) => {
  try {
      const { user_id } = req.query;

      if (!user_id) {
          return res.status(400).json({ error: 'User ID is required' });
      }

      // Fetch user data from Supabase authentication
      const { data, error } = await supabase.auth.admin.getUserById(user_id);

      if (error) {
          return res.status(500).json({ error: error.message });
      }

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

      res.json({
          full_name: data.user.user_metadata?.full_name || '',
          email: data.user.email,
          country: data.user.user_metadata?.country || '',
          email_preferences: data.user.user_metadata?.email_preferences || { marketing: true, newsletter: true },
          notification_preferences: data.user.user_metadata?.notification_preferences || { email: true, browser: false, mobile: true },
      });
  } catch (error) {
      console.error('Error fetching admin profile:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
// app.use(cors({ origin: "https://biddersportal.com" })); // Allow frontend only
app.use(errorMiddleware);

const intasend = new IntaSend({
  publicAPIKey: process.env.INTASEND_PUBLIC_KEY,
  privateAPIKey: process.env.INTASEND_SECRET_KEY,
  test: false,
});


// ✅ Store payment when user pays
app.post("/payment/success", async (req, res) => {
  try {
    let { userEmail, tenderRef } = req.body;
    userEmail = userEmail.trim().toLowerCase();

    if (!tenderRef || !userEmail) {
      console.log("Missing fields:", { userEmail, tenderRef });
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Match both string and number BDR_No
    const tender = await Tender.findOne({
      $or: [
        { BDR_No: Number(tenderRef) },
        { BDR_No: tenderRef }
      ]
    });

    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    // Normalize all emails for comparison
    const paidUsersNormalized = (tender.paidUsers || []).map(e => e.trim().toLowerCase());
    if (!paidUsersNormalized.includes(userEmail)) {
      await Tender.updateOne(
        // { _id: tender._id },
        { BDR_No: tender.BDR_No },
        { $addToSet: { paidUsers: userEmail } }
      );
    }

    // ✅ Send Confirmation Email
    const emailPayload = {
      recipient: userEmail, // Email address
      name: userEmail.split("@")[0], // Extract name from email
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


  console.log("📩 Sending Email Payload:", emailPayload); // Log the payload

    // ✅ If this is a subscription payment, send a subscription confirmation email
    if (req.body.isSubscription) {
      const { userEmail, selectedCategories, selectedCountries, subscriptionType, endDate } = req.body;

      

      console.log("📩 Sending Subscription Email Payload:", emailPayload); // Log the payload

      try {
          const emailResponse = await axios.post(
              "https://hazi.co.ke/api/v3/email/send",
              emailPayload,
              {
                  headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` },
              }
          );

          console.log("✅ Subscription Email Sent:", emailResponse.data);
      } catch (error) {
          console.error("❌ Subscription Email Failed:", error.response?.data || error.message);
      }
  }
  try {
      const emailResponse = await axios.post(
          "https://hazi.co.ke/api/v3/email/send",
          emailPayload,
          {
              headers: { Authorization: `Bearer ${process.env.YOUR_HAZI_API_TOKEN}` },
          }
      );
  
      console.log("✅ Email API Response:", emailResponse.data); // Log response
  } catch (error) {
      console.error("❌ Email sending failed:", error.response?.data || error.message);
  }
    res.json({ message: "Payment recorded & email sent", tenderRef });
  } catch (error) {
    console.error("❌ Error processing payment:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/files/*", async (req, res) => {
  try {
    let filePath = req.params[0]; // Extract the full path after `/files/`

    // ✅ Construct the original file URL
    const originalFileUrl = `https://www.biddetail.co.in/GlobalTenderDocuments/${filePath}`;

    console.log(`📂 Fetching file from: ${originalFileUrl}`);

    const response = await fetch(originalFileUrl);
    if (!response.ok) {
      console.log("❌ File fetch failed:", response.status);
      return res.status(404).json({ message: "File not found" });
    }

    const buffer = await response.arrayBuffer();
    console.log("✅ File fetched, size:", buffer.byteLength);

    res.setHeader("Content-Disposition", `attachment; filename="Tender_${filePath.split('/').pop()}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Error fetching file:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ API to fetch a tender by BDR_No
app.get("/tenders/:tenderRef", async (req, res) => {
  try {
    let { userEmail } = req.query;
    const tenderRef = req.params.tenderRef;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    userEmail = decodeURIComponent(userEmail).trim().toLowerCase();

    // Match both string and number BDR_No
    const tender = await Tender.findOne({
      $or: [
        { BDR_No: Number(tenderRef) },
        { BDR_No: tenderRef }
      ]
    });

    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    // Normalize all emails for comparison
    const paidUsersNormalized = (tender.paidUsers || []).map(e => e.trim().toLowerCase());
    if (!paidUsersNormalized.includes(userEmail)) {
      return res.status(403).json({ message: "Access denied. Please pay first." });
    }

    const tenderData = {
      ...tender.toObject(),
      FileUrl: tender.FileUrl,
    };

    res.json(tenderData);
  } catch (error) {
    console.error("❌ Error fetching tender:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// ...existing code...


// API routes
import authRoutes from "./routes/authRoutes.js";
import tenderRoutes from "./routes/tenderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import preQualificationRoutes from "./routes/preQualificationRoutes.js";

import membershipRoutes from "./routes/membershipRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import biddingAssistanceRoutes from "./routes/biddingAssistanceRoutes.js";
// app.use(cors({ origin: process.env.FRONTEND_URL }));
import notificationRoutes from "./routes/notificationRoutes.js";
import statsRoutes from "./routes/stats.js";

app.use("/api", statsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paypalRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/prequalification", preQualificationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/bidding-assistance", biddingAssistanceRoutes);
// app.use("/api/tenders/purchased", purchasedTendersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/payments", paypalRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/notifications", subscriptionRoutes);
// app.use("/api/prequalification", preQualificationRoutes);

// ✅ Schedule the tender import to run every 24 hours (midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("⏳ Starting scheduled tender import...");
  await loadInitialData();
});

// Schedule to run every day at 6 AM
cron.schedule("0 8 * * *", () => {
  console.log("Running daily tender notifications...");
  sendDailyNotifications();
});

import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the frontend build folder
app.use(express.static(path.join(__dirname, 'client', 'build'))); // or 'frontend' if that's your folder

// Fallback route for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
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