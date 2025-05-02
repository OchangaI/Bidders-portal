import express from "express";
import Subscription from "../models/Subscription.js";
import { 
    subscribeUser, 
    getSubscribers, 
    // initiatePayment
} from "../controllers/subscriptionController.js";

const router = express.Router();

// router.post("/initiate-payment", initiatePayment); // New route to start payment
router.post("/subscribe", subscribeUser); // Verifies payment and subscribes user
router.get("/", getSubscribers); // Fetch all subscribers


// ✅ Save user subscription after payment
// router.post("/subscribe", async (req, res) => {
//   try {
//     const { userEmail, selectedCategories, selectedCountries, subscriptionType, paymentRef } = req.body;

//     if (!userEmail || !selectedCategories.length || !selectedCountries.length || !subscriptionType || !paymentRef) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Set end date based on subscription type
//     const endDate = new Date();
//     if (subscriptionType === "monthly") {
//       endDate.setMonth(endDate.getMonth() + 1);
//     } else {
//       endDate.setFullYear(endDate.getFullYear() + 1);
//     }

//     // Save the subscription
//     const subscription = new Subscription({
//       userEmail,
//       selectedCategories,
//       selectedCountries,
//       subscriptionType,
//       endDate,
//       paymentRef,
//     });

//     await subscription.save();
//     res.status(201).json({ message: "Subscription successful", subscription });

//   } catch (error) {
//     res.status(500).json({ message: "Error subscribing", error: error.message });
//   }
// });

// // ✅ Get user's active subscription
// router.get("/my-subscription", async (req, res) => {
//   const { userEmail } = req.query;

//   try {
//     const subscription = await Subscription.findOne({ userEmail, isActive: true, endDate: { $gte: new Date() } });

//     if (!subscription) {
//       return res.status(404).json({ message: "No active subscription found" });
//     }

//     res.json(subscription);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching subscription", error: error.message });
//   }
// });

export default router;
