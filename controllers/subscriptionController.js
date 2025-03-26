import Subscription from "../models/Subscription.js";
import Tender from "../models/Tender.js";
import sendEmail from "../utils/emailSubService.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY; // Load from environment variables

/**
 * @desc Initiate a payment with Flutterwave
 * @route POST /api/subscriptions/initiate-payment
 */
export const initiatePayment = async (req, res) => {
  try {
    const { userEmail, charge, subscriptionType, selectedCategories, selectedCountries } = req.body;

    if (!userEmail || !charge || !subscriptionType || !selectedCategories.length || !selectedCountries.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const txRef = `sub_${Date.now()}`;
    console.log("Initiating payment with txRef:", txRef);

    // Call Flutterwave API to create a payment request
    const flwResponse = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount: charge,
        currency: "KES",
        // redirect_url: `http://localhost:3000/payment-success?tx_id={transaction_id}&email=${encodeURIComponent(userEmail)}&type=${encodeURIComponent(subscriptionType)}&categories=${encodeURIComponent(selectedCategories.join(","))}&countries=${encodeURIComponent(selectedCountries.join(","))}`,
        redirect_url: `https://biddersportal.com/payment-success?tx_id={transaction_id}&email=${encodeURIComponent(userEmail)}&type=${encodeURIComponent(subscriptionType)}&categories=${encodeURIComponent(selectedCategories.join(","))}&countries=${encodeURIComponent(selectedCountries.join(","))}`,
        payment_options: "card,mobilemoney,ussd",
        customer: { email: userEmail },
        customizations: { title: "Tender Notifications", description: "Subscription Payment" },
      },
      {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      }
    );

    if (flwResponse.data.status !== "success") {
      console.error("Payment initiation failed:", flwResponse.data);
      return res.status(400).json({ message: "Payment initiation failed", details: flwResponse.data });
    }

    console.log("Payment initiated successfully with txRef:", txRef);
    res.json({ paymentLink: flwResponse.data.data.link, txRef });
  } catch (error) {
    console.error("Error initiating payment:", error.response ? error.response.data : error.message);
    res.status(500).json({ message: "Error initiating payment", error: error.message });
  }
};

/**
 * @desc Subscribe user after payment verification
 * @route POST /api/subscriptions/subscribe
 */
export const subscribeUser = async (req, res) => {
  try {
    const { userEmail, selectedCategories, selectedCountries, subscriptionType, transaction_id } = req.body;

  if (!userEmail || !selectedCategories.length || !selectedCountries.length || !subscriptionType || !transaction_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  console.log("Verifying payment with transaction_id:", transaction_id);

  const flwResponse = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
  });

    if (
      flwResponse.data.status !== "success" ||
      flwResponse.data.data.status !== "successful"
      // flwResponse.data.data.tx_ref !== txRef
    ) {
      console.error("Payment verification failed:", flwResponse.data);
      return res.status(400).json({ message: "Payment verification failed", details: flwResponse.data });
    }
    
    

    console.log("Payment verified successfully");

    // Determine subscription end date
    const endDate = new Date();
    subscriptionType === "monthly" ? endDate.setMonth(endDate.getMonth() + 1) : endDate.setFullYear(endDate.getFullYear() + 1);

    console.log("Saving subscription:", {
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      endDate,
      paymentRef: transaction_id,
    });
    
    const subscription = new Subscription({
      userEmail,
      selectedCategories,
      selectedCountries,
      subscriptionType,
      endDate,
      paymentRef: transaction_id,
      isActive: true,
    });
    
    await subscription.save();
    console.log("Subscription saved successfully:", subscription);

    return res.json({ success: true, message: "Subscription successful", subscription });

    
  } catch (error) {
    console.error("Error subscribing:", error.response ? error.response.data : error.message);
    res.status(500).json({ message: "Error subscribing", error: error.message });
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
export const sendDailyNotifications = async () => {
  try {
    const today = new Date();
    const activeSubscriptions = await Subscription.find({ isActive: true, endDate: { $gte: today } });

    for (const subscription of activeSubscriptions) {
      const { userEmail, selectedCategories, selectedCountries } = subscription;

      // Fetch tenders matching user preferences
      const tenders = await Tender.find({
        Tender_Category: { $in: selectedCategories },
        Country: { $in: selectedCountries },
        Closing_Date: { $gte: today }, // Only upcoming tenders
      });

      if (tenders.length > 0) {
        const tenderList = tenders
          .map((t) => `<li>${t.Tender_Title} - ${t.Country} (Closing: ${t.Closing_Date.toDateString()})</li>`)
          .join("");

        const emailContent = `
          <h3>Daily Tender Notifications</h3>
          <p>Here are today's tenders matching your preferences:</p>
          <ul>${tenderList}</ul>
          <p>Good luck with your bidding!</p>
        `;

        await sendEmail(userEmail, "Your Daily Tender Updates", emailContent);
      }
    }

    console.log("Daily notifications sent successfully.");
  } catch (error) {
    console.error("Error sending daily notifications:", error.message);
  }
};
