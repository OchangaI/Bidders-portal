import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import DashboardUser from '../models/DashboardUsers.js';

// const MONGO_URI = 'mongodb://localhost:27017/your-db-name'; // update as needed


async function createAdmin() {
  await mongoose.connect('mongodb+srv://danfdev6:Danf102020!@cluster0.yeci2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  const existingAdmin = await DashboardUser.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin already exists:', existingAdmin.email);
    process.exit();
  }

  // const password = await bcrypt.hash('Bidders@2025!', 10); // set your initial password
  const admin = new DashboardUser({
    name: 'Super Admin',
    email: 'admin@biddersportal.com',
    password: 'Bidders@2025!', // set your initial password
    role: 'admin'
  });

  await admin.save();
  console.log('Admin user created:', admin.email);
  process.exit();
}

createAdmin();