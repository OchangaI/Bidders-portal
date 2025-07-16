import express from "express";
import axios from "axios";
import PreQualification from "../models/PreQualification.js";

// import { verifyAdmin } from "../middleware/adminMiddleware.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Function to send prequalification email
const sendPrequalificationEmail = async (to, type, variables) => {
  console.log(`Sending email to ${to} with type ${type} and variables ${JSON.stringify(variables)}`);

  // Define custom templates
  const templates = {
    Supplier: {
      prequalification_pending: {
        subject: "Your Supplier Pre-Qualification Request is Pending",
        body: `Dear {{companyName}},
        
        Your supplier pre-qualification request is currently pending. 
        We will notify you once it is reviewed.

        Thank you.`,
      },
      prequalification_approved: {
        subject: "Your Supplier Pre-Qualification Request is Approved",
        body: `Dear {{companyName}},
        
        Congratulations! 
        Your supplier pre-qualification request has been approved.
        
        Thank you.`,
      },
    },
    Client: {
      prequalification_pending: {
        subject: "Your Client Pre-Qualification Request is Pending",
        body: `Dear {{companyName}},
        
        Your client pre-qualification request is currently pending. 
        We will notify you once it is reviewed.
        
        Thank you.`,
      },
      prequalification_approved: {
        subject: "Your Client Pre-Qualification Request is Approved",
        body: `Dear {{companyName}},
        
        Congratulations!
        Your client pre-qualification request has been approved.
        
        Thank you.`,
      },
    },
    // Add more templates as needed
  };

  const template = templates[type]?.prequalification_pending;
  if (!template) {
    console.error(`Email template not found for type: ${type}`);
    throw new Error("Email template not found");
  }

  const message = template.body.replace(/{{(\w+)}}/g, (_, key) => variables[key] || "");

  await axios.post(
    "https://hazi.co.ke/api/v3/email/send",
    {
      recipient: to,
      subject: template.subject,
      message,
    },
    { headers: { Authorization: `Bearer ${process.env.HAZI_API_KEY}` } }
  );
};

// ✅ Process Pre-Qualification Submission & Payment
router.post("/submit", async (req, res) => {
  try {
    const {
      type,
      companyName,
      companyType,
      country,
      location,
      phoneNumber,
      categoriesOfInterest,
      supplyLocations,
      emailAddress,
      websiteOrSocialMedia,
      pin,
      amountPaid,
      currency,
    } = req.body;

    // ✅ Validate Input
    if (!companyName || !emailAddress || !phoneNumber || !pin) {
      return res.status(400).json({ message: "Missing required fields" });
    }


    // ✅ Save "Pending" Pre-Qualification Entry
    const preQualification = new PreQualification({
      type,
      companyName,
      companyType,
      country,
      location,
      phoneNumber,
      categoriesOfInterest,
      supplyLocations,
      emailAddress,
      websiteOrSocialMedia,
      pin,
      amountPaid,
      currency,
      paymentStatus: "Paid",
    });

    await preQualification.save();

    // Send prequalification email
    try {
      await sendPrequalificationEmail(emailAddress, type, { companyName, type });
    } catch (emailError) {
      console.error("Error sending prequalification email:", emailError);
    }

    res.status(201).json({ message: "Prequalification submitted successfully" });
  } catch (error) {
    console.error("Error processing pre-qualification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Update prequalification request status and send notification emails
 */
router.put("/update-status", async (req, res) => {
  try {
    const { requestId, status } = req.body;

    const updatedRequest = await PreQualification.findByIdAndUpdate(
      requestId,
      { $set: { status } }, // Ensure status is explicitly set
      { new: true, upsert: true } // upsert ensures the field is added if missing
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Get all prequalification requests
router.get("/", async (req, res) => {
  try {
    const requests = await PreQualification.find().sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching prequalification requests", error });
  }
});

// ✅ Fetch User Pre-Qualifications
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const preQualifications = await PreQualification.find({ emailAddress: email, paymentStatus: "Paid" });
    res.json(preQualifications);
  } catch (error) {
    console.error("Error fetching pre-qualifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific prequalification request by ID
router.get("/:id", async (req, res) => {
  try {
    const request = await PreQualification.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Prequalification request not found" });
    }
    res.status(200).json(request);
  } catch (error) {
        res.status(500).json({ message: "Error fetching prequalification request", error });
      }
    });



export default router;
