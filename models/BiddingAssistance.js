import mongoose from "mongoose";

const BiddingAssistanceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ["pending", "responded"], default: "pending" },
    response: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("BiddingAssistance", BiddingAssistanceSchema);
