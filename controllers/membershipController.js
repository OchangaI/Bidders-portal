import Membership from '../models/Membership.js';
import axios from 'axios';

// Register new membership
export const registerMembership = async (req, res) => {
  try {
    console.log("Received Membership Request:", req.body);

    const { email, name, subscriptionType, } = req.body;

    if (!email || !name || !subscriptionType ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingMember = await Membership.findOne({ email });
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member.' });
    }

    const duration = subscriptionType === 'monthly' ? 30 : 365;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    const newMembership = new Membership({
      email,
      name,
      subscriptionType,
      endDate,
    });

    await newMembership.save();
    console.log(`New membership registered:`, newMembership);
    
    // 📩 Send email after saving
    await sendMembershipConfirmationEmail({ email, name, subscriptionType, endDate });
    res.status(201).json({ message: 'Membership registered successfully', membership: newMembership });

    console.log(`New membership registered:`, newMembership);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ error: 'User is already a member.' });
    }
    console.error('Error registering membership:', error);
    res.status(500).json({ error: error.message });
  }
};

const sendMembershipConfirmationEmail = async ({ email, name, subscriptionType, endDate }) => {
  try {
    const subject = "🎉 Welcome to Our Membership Program!";
    
    // HTML Message
    const message = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Welcome, ${name}!</h2>
        <p>Congratulations! Your membership has been successfully activated. 🎉</p>

        <h3>Membership Details:</h3>
        <ul>
          <li><strong>Type:</strong> ${subscriptionType === 'monthly' ? 'Monthly Membership' : 'Yearly Membership'}</li>
          <li><strong>Valid Until:</strong> ${endDate.toDateString()}</li>
        </ul>

        <h3>What to Expect Next:</h3>
        <ul>
          <li>✅ Daily tender notifications delivered to your email.</li>
          <li>✅ Exclusive member-only opportunities and resources.</li>
          <li>✅ Priority support and latest updates.</li>
        </ul>

        <p>We are excited to have you on board and look forward to helping you discover new opportunities!</p>

        <p style="margin-top: 30px;">Cheers,<br><strong>The Bidders Portal Team</strong></p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
        <small style="color: #999;">If you have any questions, feel free to reply to this email or contact our support team.</small>
      </div>
    `;

    // Using your email API (example with Hazi.co.ke API)
    await axios.post('https://hazi.co.ke/api/v3/email/send', {
      recipient: email,
      name: name,
      subject,
      message,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.HAZI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send confirmation email:', error.message);
    // Don't throw error so membership saving continues
  }
};



// Get all members
export const getAllMembers = async (req, res) => {
  try {
    const members = await Membership.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check Membership Status
export const checkMembershipStatus = async (req, res) => {
  try {
    const { email } = req.params;
    const member = await Membership.findOne({ email });

    if (!member) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    res.json({ status: member.status, endDate: member.endDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single member by ID
export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Membership.findById(id);

    if (!member) return res.status(404).json({ error: 'Member not found' });

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update membership details
export const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMember = await Membership.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedMember) return res.status(404).json({ error: 'Member not found' });

    res.json({ message: 'Membership updated successfully', member: updatedMember });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete membership
export const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMember = await Membership.findByIdAndDelete(id);

    if (!deletedMember) return res.status(404).json({ error: 'Member not found' });

    res.json({ message: 'Membership deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Payment success handler (to be called after payment is processed)
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { email, transactionId } = req.body;

    // Find the membership by transaction ID
    const membership = await Membership.findOne({ transactionId });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Update membership status to active
    membership.status = 'active';
    await membership.save();

    res.json({ message: 'Payment successful, membership activated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Frontend payment success handler (to be used in client-side code)
export const frontendPaymentSuccessHandler = async (res) => {
  if (res.ok) {
    alert('Payment successful! Membership activated.');
  } else {
    const error = await res.json();
    alert('Payment successful but failed to activate membership: ' + (error.error || error.message));
  }
};
