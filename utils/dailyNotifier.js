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

      const response = await axios.post("https://hazi.co.ke/api/v3/email/send", {
        api_key: process.env.HAZI_API_KEY, // Use your Hazi API key from environment variables
        // api_key: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2IiwianRpIjoiODA5ODdmMmNhNTU1MGFhMjI2YjFlNGE3MjNkZTU1NjU5NTBiNzllMTVhZTE3MmFkZjNkY2I3ZTdkYjczNjM1YzA3ZThhYWQyMzJiODFjYTgiLCJpYXQiOjE3NTIwNTQ5ODQuNjY5Njc2LCJuYmYiOjE3NTIwNTQ5ODQuNjY5Njc4LCJleHAiOjE3ODM1OTA5ODQuNjYzMzk2LCJzdWIiOiI4NiIsInNjb3BlcyI6W119.dBmISuhWT7MjGCBMzp1_rSP38KZHVUGpBGa0fgFBbf8aYqepEW80inOVjbFRqJFQXPdP18Xpl-xTqTgw76-Kbb9uEVCUF_Nmrr70zOZk405Ow_c34AMgKcBCJE-Os5DmXsA9Y9n_XAKlhMwNVFZYiuqMRpGe8VMCl-W8PukcHEX-7qvc-tYvyUg-a-QguPGyteBhq3OL7a9WKFn3LtuGtY_gCi7Hr5_hQ6KoyaBe1QXGPV8WYYWarW9FEzBf0XjsK71xbigBH8aFDoSn0XbvGFdA_Bwd3l87amZjhMBJeFPcPeT0kiPum6laGZvk5fvWqXU7PCVHdPMuQEafzk_sZvk7GBiUO0DveUFGnb44KCySN06BazF37SDtlkNalbdqC1ciNnQk0LlpyeFCThQHXGyeBtJg-wiWeIkNhx47pxJrMo2z_1Sw4zCUMNL9Idpw9D2kN6VpzP5uc_u4ARGlYZvZrVOur93pAofkEFISGuPdCogDzEoKY_R4Tsxk6ArpeCui-5Ci5WxyydqzLkqQPLK78jKVWYW27m9VfDm67aBlGTtQH8m4h9bu5R3WI__losE9LEAi1d2hCN5J8o8TDwhgQdfPXzom2A8LGSc3aOrO8Q0S3ityXNkrkn-YZHcSCASeyObIUuI_Edu1GKGBfkJ21s-mWP2NHNvgFckZF_4",
        recipient: userEmail,
        name: userEmail, // or user's name if available
        subject: "📩 New Tenders Matching Your Preferences",
        message: emailBody, // use plain text or HTML if supported
      });
      console.log("Email API response:", response.data);
      console.log(`📧 Notification sent to: ${userEmail}`);
    }

    console.log(`✅ Daily notifications sent. ${subscribers.length} users notified.`);
    console.log(`✅ Daily notifications sent to. ${subscribers}`);
  } catch (err) {
    console.error("❌ Error sending daily notifications:", err);
  }
};

// Run every day at 8 AM
cron.schedule("0 16 * * *", () => {
  console.log("🚀 Running daily tender notification job...");
  sendDailyNotifications();
});
