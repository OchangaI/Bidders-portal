import DashboardUser from '../models/DashboardUsers.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'admin_dashboard_secret';

// Register new user
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Only admin can create admin users.' });
    }
    const user = new DashboardUser({ name, email, password, role });
    await user.save();
    res.status(201).json({ message: 'User registered.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await DashboardUser.findOne({ email });
  // if (!user || !(await user.comparePassword(password))) {
  //   return res.status(401).json({ message: 'Invalid credentials' });
  // }
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
}
// TEMP: Log both passwords
console.log('Input Password:', password);
console.log('Hashed Password in DB:', user.password);

const isMatch = await user.comparePassword(password);
if (!isMatch) {
    console.log('Password mismatch');
    return res.status(401).json({ message: 'Invalid password' });
}

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

// Get all users (admin only)
export const getAll = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const users = await DashboardUser.find().select('-password');
  res.json(users);
};

// Update user (admin only)
export const update = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { id } = req.params;
  const { name, email, role } = req.body;
  const user = await DashboardUser.findByIdAndUpdate(id, { name, email, role }, { new: true }).select('-password');
  res.json(user);
};

// Delete user (admin only)
export const remove = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  await DashboardUser.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};