import { Schema, model } from "mongoose";

const emailTemplateSchema = new Schema({
  type: { type: String, required: true, unique: true }, // e.g., "prequalification_pending"
  subject: { type: String, required: true }, // Email subject
  body: { type: String, required: true }, // Email body with placeholders
  variables: [{ type: String }], // Placeholders like ["{user_name}", "{order_id}"]
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default model("EmailTemplate", emailTemplateSchema);
