import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    serviceType: { 
      type: String, 
      enum: ["tender", "bidding_assistance", "prequalification", "subscription", "membership"], 
      required: true 
    },
    transactionId: { type: String, required: true, unique: true }, // Flutterwave transaction ID
    status: { type: String, enum: ["successful", "pending", "failed"], default: "successful" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
