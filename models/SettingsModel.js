import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  paymentOptions: {
    paypal: { type: Boolean, default: false },
    stripe: { type: Boolean, default: false },
  },
  notifications: {
    email: { type: Boolean, default: true },
    browser: { type: Boolean, default: false },
    mobile: { type: Boolean, default: true },
  },
  regional: {
    timeZone: { type: String, default: "Africa/Nairobi" },
    language: { type: String, default: "English" },
  },
}, { timestamps: true });

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
