import Membership from '../models/Membership.js';

// Register new membership
export const registerMembership = async (req, res) => {
  try {
    console.log("Received Membership Request:", req.body);

    const { email, name, subscriptionType, transactionId } = req.body;

    if (!email || !name || !subscriptionType || !transactionId) {
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
      transactionId,
      endDate,
    });

    await newMembership.save();
    res.status(201).json({ message: 'Membership registered successfully', membership: newMembership });

    console.log(`New membership registered:`, newMembership);
  } catch (error) {
    console.error('Error registering membership:', error);
    res.status(500).json({ error: error.message });
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
