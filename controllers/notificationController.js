import Subscription from "../models/Subscription.js";
import Tender from "../models/Tender.js";
import axios from "axios";

export const subscribeUser = async (req, res) => {
  try {
    const {
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      endDate,
    } = req.body;

    const today = new Date();

    const newSubscription = new Subscription({
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      startDate: today,
      endDate,
    });

    await newSubscription.save();

    // Send confirmation email via Hazi (as before)
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

    await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: userEmail,
        name: userEmail.split("@")[0],
        subject: "Your Tender Subscription is Confirmed ✅",
        message: emailBody,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Fetch today's tenders matching user preferences
    const tenders = await Tender.find({
      createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
      category: { $in: selectedCategories },
      country: { $in: selectedCountries },
    });

    let tenderListHTML = "<li>No new tenders today, but you'll start receiving alerts as soon as new ones are posted.</li>";
    if (tenders.length > 0) {
      tenderListHTML = tenders
        .map(
          (t) => `
            <li>
              <strong>${t.title}</strong> — ${t.country} <br />
              <a href="${t.link}">View Details</a>
            </li>
          `
        )
        .join("");
    }

    const notificationBody = `
      <h2>📢 Your Daily Tender Alerts</h2>
      <p>Hi ${userEmail},</p>
      <p>Here are new tenders matching your preferences:</p>
      <ol>${tenderListHTML}</ol>
      <br />
      <p>— BiddersPortal Team</p>
    `;

    await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        recipient: userEmail,
        name: userEmail.split("@")[0],
        subject: "📩 New Tenders Matching Your Preferences",
        message: notificationBody,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HAZI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ message: "Subscription successful and emails sent." });
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

