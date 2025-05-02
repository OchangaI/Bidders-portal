export const sendEmail = async (to, subject, html) => {
  try {
    const response = await axios.post(
      "https://hazi.co.ke/api/v3/email/send",
      {
        to,
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.YOUR_HAZI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Hazi email sent to ${to}: ${subject}`);
    return response.data;
  } catch (error) {
    console.error("❌ Hazi email error:", error.response?.data || error.message);
    throw error; // Let the caller catch and handle
  }
};
