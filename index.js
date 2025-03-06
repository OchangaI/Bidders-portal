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

// import notificationRoutes from "./routes/notificationRoutes.js";


import cron from "node-cron";

dotenv.config(); // Load environment variables

const router = express.Router();


import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://cbdbitjcgjlvcezcnojh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const app = express();

// Middleware
app.use(express.json());
const allowedOrigins = [
  'http://localhost:3000',  // Frontend
  'http://localhost:5173',  // Admin Dashboard
  'https://biddersportal.com',  // Deployed Frontend
  'https://admin.biddersportal.com'  // Deployed Admin Dashboard
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
app.use(cors({ origin: "https://biddersportal.com" })); // Allow frontend only
app.use(errorMiddleware);

// ✅ Store payment when user pays
app.post("/payment/success", async (req, res) => {
  try {
    const { userEmail, tenderRef } = req.body;

    if (!tenderRef || !userEmail) {
      return res.status(400).json({ message: "Missing payment details" });
      console.log(res);
    }

    const tender = await Tender.findOne({ BDR_No: Number(tenderRef) }); // ✅ Convert tenderRef to number

    if (!tender) {
      return res.status(404).json({ message: "Tender not found" });
    }

    if (!tender.paidUsers.includes(userEmail)) {
      tender.paidUsers.push(userEmail);
      await tender.save();
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

      const emailPayload = {
          recipient: userEmail,
          recipient_name: userEmail.split("@")[0], // Extract name
          subject: "Subscription Confirmation",
          message: `
              <h2>Thank You for Subscribing! 🎉</h2>
              <p>Your subscription details:</p>
              <ul>
                  <li><strong>Categories:</strong> ${selectedCategories.join(", ")}</li>
                  <li><strong>Countries:</strong> ${selectedCountries.join(", ")}</li>
                  <li><strong>Type:</strong> ${subscriptionType}</li>
                  <li><strong>Valid Until:</strong> ${new Date(endDate).toDateString()}</li>
              </ul>
              <p>You will start receiving daily tender notifications matching your preferences.</p>
              <p>Thank you for using our platform!</p>
          `,
      };

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

// =======

//     // ✅ Send Confirmation Email
//     const emailPayload = {
//       recipient: userEmail, // Email address
//       name: userEmail.split("@")[0], // Extract name from email
//       subject: "Tender Purchase Confirmation",
//       message: `
//           <h2>Congratulations! 🎉</h2>
//           <p>You have successfully purchased the tender:</p>
//           <strong>${tender.Tender_Brief}</strong>
//           <p>Country: ${tender.Country}</p>
//           <p>Expiry Date: ${new Date(tender.Tender_Expiry).toDateString()}</p>
//           <p><a href="${tender.FileUrl}" target="_blank">Download Tender Document</a></p>
//           <p>Thank you for using our platform!</p>
//       `,
//   };
  
//   console.log("📩 Sending Email Payload:", emailPayload); // Log the payload
// >>>>>>> ffb1673 (adding email forwarding)
  
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
import settingsRoutes from "./routes/settingsRoutes.js";
import biddingAssistanceRoutes from "./routes/biddingAssistanceRoutes.js";
// app.use(cors({ origin: process.env.FRONTEND_URL }));
import statsRoutes from "./routes/stats.js";

app.use("/api", statsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paypalRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/prequalification", preQualificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/bidding-assistance", biddingAssistanceRoutes);
// app.use("/api/tenders/purchased", purchasedTendersRoutes);


app.use(cors({ origin: process.env.FRONTEND_URL }));

app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paypalRoutes);
// app.use("/api/notifications", notificationRoutes);
app.use("/api/notifications", subscriptionRoutes);
app.use("/api/prequalification", preQualificationRoutes);

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
