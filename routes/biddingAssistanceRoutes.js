import express from "express";
import {
  createBiddingRequest,
  updateRequestStatus,
  getRequests,
  respondToRequest,
  sendReply,
  deleteRequest,
} from "../controllers/biddingAssistanceController.js";

const router = express.Router();

// Bidding Assistance Routes
router.post("/create", createBiddingRequest); // Create bidding assistance request & send confirmation email
router.post("/update-request/:requestId", updateRequestStatus); // Mark as responded
router.delete("/delete/:requestId", deleteRequest); // Delete request
router.get("/requests", getRequests); // Get all requests (admin)
router.post("/send-reply", sendReply); // Send reply to user
router.post("/respond", respondToRequest); // Respond to a request

export default router;
