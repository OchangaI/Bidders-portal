import mongoose from "mongoose";
import dotenv from "dotenv";
import EmailTemplate from "../models/EmailTemplate.js";

dotenv.config();

const emailTemplates = [
  {
    type: "prequalification_pending",
    subject: "Your Pre-Qualification Request is Pending",
    body: "Dear {{user_name}},\n\nYour pre-qualification request is currently pending. We will notify you once it is reviewed.\n\nThank you.",
    variables: ["user_name"],
  },
  {
    type: "prequalification_approved",
    subject: "Your Pre-Qualification Request is Approved",
    body: "Dear {{user_name}},\n\nCongratulations! Your pre-qualification request has been approved.\n\nThank you.",
    variables: ["user_name"],
  },
  // Add more templates as needed
];

const insertEmailTemplates = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/biddersportal');

    for (const template of emailTemplates) {
      await EmailTemplate.findOneAndUpdate(
        { type: template.type },
        template,
        { upsert: true, new: true }
      );
    }

    console.log("Email templates inserted successfully");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error inserting email templates:", error);
    mongoose.disconnect();
  }
};

insertEmailTemplates();