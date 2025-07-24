import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  reference: String,
  amount: Number,
  status: String,
  created_on: Date,
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
