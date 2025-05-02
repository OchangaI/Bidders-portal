import cron from "node-cron";
import axios from "axios";
import Subscription from "../models/Subscription.js";
import Tender from "../models/Tender.js"; // your existing tenders collection

const sendDailyNotifications = async () => {
  try {
    const today = new Date();
    const subscribers = await Subscription.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    for (const user of subscribers) {
      const { userEmail, selectedCategories, selectedCountries } = user;

      // Fetch today's tenders matching user prefs
      const tenders = await Tender.find({
        createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
        category: { $in: selectedCategories },
        country: { $in: selectedCountries },
      });

      if (tenders.length === 0) continue;

      const tenderListHTML = tenders
        .map(
          (t) => `
            <li>
              <strong>${t.title}</strong> — ${t.country} <br />
              <a href="${t.link}">View Details</a>
            </li>
          `
        )
        .join("");

      const emailBody = `
        <h2>📢 Your Daily Tender Alerts</h2>
        <p>Hi ${userEmail},</p>
        <p>Here are new tenders matching your preferences:</p>
        <ol>${tenderListHTML}</ol>
        <br />
        <p>— BiddersPortal Team</p>
      `;

      await axios.post("https://hazi.co.ke/api/v3/email/send", {
        api_key: process.env.HAZI_API_KEY,
        to: userEmail,
        from: "notifications@biddersportal.com",
        subject: "📩 New Tenders Matching Your Preferences",
        html: emailBody,
      });
    }

    console.log("✅ Daily notifications sent.");
  } catch (err) {
    console.error("❌ Error sending daily notifications:", err.message);
  }
};

// Run every day at 8 AM
cron.schedule("0 12 * * *", () => {
  console.log("🚀 Running daily tender notification job...");
  sendDailyNotifications();
});
