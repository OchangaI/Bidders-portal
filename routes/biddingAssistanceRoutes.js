import express from "express";
import BiddingAssistance from "../models/BiddingAssistance.js";
import {
  // createRequest,
  initiatePayment,
  verifyPayment,
  getRequests,
  respondToRequest,
  sendReply,
} from "../controllers/biddingAssistanceController.js";

const router = express.Router();

// router.post("/create", createRequest);
router.post("/initiate-payment", initiatePayment);
router.get("/verify-payment", verifyPayment);
router.get("/requests", getRequests);
router.post("/send-reply", sendReply);
router.post("/respond", respondToRequest);



export default router;
