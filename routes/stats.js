import express from "express";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Tender from "../models/Tender.js";
import BiddingAssistance from "../models/BiddingAssistance.js";
import Membership from "../models/Membership.js";
import Prequalification from "../models/PreQualification.js";
import Payment from "../models/Payment.js"; // If you store payments separately
import mongoose from "mongoose";

const router = express.Router();

// Revenue Growth Stats
router.get("/revenue/growth", async (req, res) => {
    try {
      const revenueGrowth = await Payment.aggregate([
        {
          $match: { status: "successful" }, // Only count successful payments
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by Year-Month
            totalRevenue: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } }, // Sort by month
      ]);
  
      res.json(revenueGrowth);
    } catch (error) {
      console.error("Error fetching revenue growth:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

// User Growth Stats

router.get("/users/growth", async (req, res) => {
    try {
      const userGrowth = await User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by Year-Month
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } }, // Sort by month
      ]);
  
      res.json(userGrowth);
    } catch (error) {
      console.error("Error fetching user growth:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

// 📌 GET: Subscription Stats
router.get("/subscriptions/stats", async (req, res) => {
  try {
    const activeSubscribers = await Subscription.countDocuments({ isActive: true });
    const totalSubscribers = await Subscription.countDocuments();
    
    res.json({ activeSubscribers, totalSubscribers });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: User Stats
router.get("/auth/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });

    res.json({ totalUsers, activeUsers });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: Tender Stats
router.get("/tenders/stats", async (req, res) => {
  try {
    const totalTenders = await Tender.countDocuments();
    res.json({ totalTenders });
  } catch (error) {
    console.error("Error fetching tenders stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: Bidding Assistance Stats
router.get("/bidding-assistance/stats", async (req, res) => {
  try {
    const totalRequests = await BiddingAssistance.countDocuments();
    const unresolvedRequests = await BiddingAssistance.countDocuments({ status: "pending" });

    res.json({ totalRequests, unresolvedRequests });
  } catch (error) {
    console.error("Error fetching bidding assistance stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: Membership Stats
router.get("/membership/stats", async (req, res) => {
  try {
    const totalMembers = await Membership.countDocuments();
    const activeMembers = await Membership.countDocuments({ isActive: true });

    res.json({ totalMembers, activeMembers });
  } catch (error) {
    console.error("Error fetching membership stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: Prequalification Stats
router.get("/prequalification/stats", async (req, res) => {
  try {
    const totalPrequalifications = await Prequalification.countDocuments();
    res.json({ totalPrequalifications });
  } catch (error) {
    console.error("Error fetching prequalification stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📌 GET: Revenue Stats (from Payments Collection)
router.get("/revenue/stats", async (req, res) => {
  try {
    const totalRevenue = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const monthlyRevenue = await Payment.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
