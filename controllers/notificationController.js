import Subscription from "../models/Subscription.js";
import axios from "axios";

export const subscribeUser = async (req, res) => {
  try {
    const {
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      transaction_id,
      endDate,
    } = req.body;

    const today = new Date();
    // const endDate = new Date(today);
    // if (subscriptionType === "monthly") {
    //   endDate.setMonth(endDate.getMonth() + 1);
    // } else if (subscriptionType === "yearly") {
    //   endDate.setFullYear(endDate.getFullYear() + 1);
    // }

    const newSubscription = new Subscription({
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      startDate: today,
      endDate,
      paymentRef: transaction_id,
    });

    await newSubscription.save();

    // Send confirmation email via Hazi
    const emailBody = `
      <h2>🎉 Subscription Confirmed!</h2>
      <p>Hi ${userEmail},</p>
      <p>Thank you for subscribing to our Tender Notification service.</p>
      <p><strong>Subscription Type:</strong> ${subscriptionType}</p>
      <p><strong>Selected Categories:</strong> ${selectedCategories.join(", ")}</p>
      <p><strong>Selected Countries:</strong> ${selectedCountries.join(", ")}</p>
      <p>You will receive daily updates starting from today. Stay tuned!</p>
      <br/>
      <p>— BiddersPortal Team</p>
    `;

//     const emailBody = `
// Hi ${userEmail},

// Thank you for subscribing to our Tender Notification service.

// Subscription Type: ${subscriptionType}
// Selected Categories: ${selectedCategories.join(", ")}
// Selected Countries: ${selectedCountries.join(", ")}

// You will receive daily updates starting from today. Stay tuned!

// — BiddersPortal Team
// `;


    await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: userEmail,
        name: userEmail.split("@")[0], // or use a real name if you have it
        subject: "Your Tender Subscription is Confirmed ✅",
        message: emailBody, // plain text or simple HTML
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    

    res.status(200).json({ message: "Subscription successful and email sent." });
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "An error occurred during subscription." });
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

