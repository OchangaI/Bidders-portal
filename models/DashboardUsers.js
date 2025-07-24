import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DashboardUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
});

// Pre-save hook to hash password
DashboardUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();  // Prevent double-hashing on updates
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
DashboardUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('DashboardUser', DashboardUserSchema);
