import Subscription from "../models/Subscription.js";
import Tender from "../models/Tender.js";
import { sendEmail } from "../utils/emailSubService.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * @desc Subscribe user after payment verification
 * @route POST /api/subscriptions/subscribe
 */
// export const subscribeUser = async (req, res) => {
//   const { userEmail, selectedCategories, selectedCountries, subscriptionType, transaction_id } = req.body;

//   if (!userEmail || !subscriptionType || !selectedCategories?.length || !selectedCountries?.length) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     const newSub = new Subscription({
//       userEmail,
//       selectedCategories,
//       selectedCountries,
//       subscriptionType,
//       transaction_id,
//       status: "active",
//       subscribedAt: new Date(),
//     });

//     await newSub.save();

//     // Send confirmation email
//     await sendEmail(
//       userEmail,
//       "Tender Notification Subscription Confirmed",
//       `<p>You are now subscribed for ${subscriptionType} tender notifications!</p>`
//     );

//     res.status(201).json({ message: "Subscription saved and email sent." });
//   } catch (err) {
//     console.error("Subscription error:", err);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
export const subscribeUser = async (req, res) => {
  const { 
    userEmail, 
    selectedCategories, 
    selectedCountries, 
    subscriptionType,
    endDate, 
    // transaction_id 
  } = req.body;

  try {
    // Check if the user is already subscribed
    const existingSub = await Subscription.findOne({ userEmail, subscriptionType, isActive: true });

    if (existingSub) {
      console.log(`⚠️ User already subscribed with email: ${userEmail}`);
      return res.status(200).json({ message: "User already subscribed." });
    }

    // Validate required fields

  if (!userEmail || !subscriptionType || !selectedCategories?.length || !selectedCountries?.length) {
    console.error("❌ Missing required fields:", req.body);
    return res.status(400).json({ message: "Missing required fields" });
  }

  // try {
  //   // Check if already subscribed for this transaction (to prevent duplicate)
  //   const existingSub = await Subscription.findOne({ transaction_id });

  //   if (existingSub) {
  //     console.log(`⚠️ User already subscribed with transaction_id: ${transaction_id}`);
  //     return res.status(200).json({ message: "User already subscribed." });
  //   }

    const newSub = new Subscription({
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      endDate,
      // transaction_id,
      status: "active",
      isActive: true,
      subscribedAt: new Date(),
      // Optional: You can add endDate depending on plan duration logic
    });

    await newSub.save();
    console.log(`✅ Subscription saved for ${userEmail}`);

    // Send confirmation email
    const subject = "Tender Notification Subscription Confirmed";
    const html = `
      <h2>🎉 Subscription Confirmed</h2>
      <p>Hi ${userEmail.split("@")[0]},</p>
      <p>You are now subscribed to <strong>${subscriptionType}</strong> tender notifications.</p>
      <p>You'll start receiving daily tenders based on:</p>
      <ol>
        <li><strong>Categories:</strong> ${selectedCategories.join(", ")}</li>
        <li><strong>Countries:</strong> ${selectedCountries.join(", ")}</li>
      </ol>
      <p>Thank you for using our service!</p>
    `;

    try {
      await sendEmail(userEmail, subject, html);
      console.log(`📧 Confirmation email sent to ${userEmail}`);
    } catch (emailError) {
      console.error("❌ Error sending confirmation email:", emailError.message || emailError);
    }

    res.status(201).json({ message: "Subscription saved and email sent." });
  } catch (err) {
    console.error("❌ Subscription error:", err);
    res.status(500).json({ message: "Internal server error.", error: err.message });
  }
};


/**
 * @desc Get all subscribers
 * @route GET /api/subscriptions
 */
export const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscription.find({});
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscribers", error: error.message });
  }
};

/**
 * @desc Send daily tender notifications to active subscribers
 */
/**
 * @desc Send daily tender notifications to active subscribers
 */
export const sendDailyNotifications = async () => {
  try {
    const today = new Date();
    const activeSubscriptions = await Subscription.find({
      isActive: true,
      endDate: { $gte: today },
    });

    for (const subscription of activeSubscriptions) {
      const { userEmail, selectedCategories, selectedCountries } = subscription;

      // Fetch tenders matching preferences
      const tenders = await Tender.find({
        Tender_Category: { $in: selectedCategories },
        Country: { $in: selectedCountries },
        Closing_Date: { $gte: today }, // Only upcoming tenders
      });

      if (tenders.length > 0) {
        const tenderList = tenders
          .map(
            (t, index) =>
              `<li><strong>${t.Tender_Title}</strong> - ${t.Country} (Closing: ${new Date(
                t.Closing_Date
              ).toDateString()})</li>`
          )
          .join("");


        const emailContent = `
          <h3>📋 Daily Tender Notifications</h3>
          <p>Here are today's tenders matching your preferences:</p>
          <ol>${tenderList}</ol>
          <p>Good luck with your bidding!</p>
          <hr />
          <small>This message was sent to ${userEmail}. To update your preferences, visit your account settings.</small>
        `;

        await sendEmail(userEmail, "Your Daily Tender Updates", emailContent);
      }
    }

    console.log("✅ Daily notifications sent successfully.");
  } catch (error) {
    console.error("❌ Error sending daily notifications:", error.message);
  }
};

/**
 * @desc Get tender notifications for a specific subscriber by ID
 * @route GET /api/notifications/:id
 */
export const getNotificationsBySubscriberId = async (req, res) => {
  const { id } = req.params;

  try {
    const subscriber = await Subscription.findById(id);

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    const today = new Date();
    const { selectedCategories, selectedCountries } = subscriber;

    const tenders = await Tender.find({
      Tender_Category: { $in: selectedCategories },
      Country: { $in: selectedCountries },
      Closing_Date: { $gte: today },
    });

    res.status(200).json({ tenders });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
