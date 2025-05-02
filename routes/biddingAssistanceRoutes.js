import express from "express";
import BiddingAssistance from "../models/BiddingAssistance.js";
import {
  // createBiddingRequest,
  sendConfirmationEmail,
  updateRequestStatus,
  getRequests,
  respondToRequest,
  sendReply,
  initializePayment,
  confirmPayment,
} from "../controllers/biddingAssistanceController.js";

const router = express.Router();

// Bidding Assistance Routes
// router.post("/create", createBiddingRequest);
router.post("/send-confirmation", sendConfirmationEmail); // Send confirmation email
router.post("/update-request", updateRequestStatus);
router.get("/requests", getRequests);
router.post("/send-reply", sendReply);
router.post("/respond", respondToRequest);

// Payment Routes (IntaSend Integration)
router.post("/payment", initializePayment); // Initiates payment
router.get("/payment/verify", confirmPayment); // Verifies payment after completion

export default router;
