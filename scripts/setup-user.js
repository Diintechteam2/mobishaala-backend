import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const setupUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mobishaala');
    console.log('✅ Connected to MongoDB');

    const allowedEmail = process.env.ALLOWED_EMAIL || 'admin@mobishaala.com';
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: allowedEmail });
    if (existingUser) {
      console.log(`ℹ️  User with email ${allowedEmail} already exists.`);
      process.exit(0);
    }

    // Get password from command line or use default
    const password = process.argv[2] || 'admin123';
    
    // Create new user
    const user = new User({
      email: allowedEmail,
      password: password
    });

    await user.save();
    console.log(`✅ User created successfully!`);
    console.log(`   Email: ${allowedEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`\n⚠️  Please change the password after first login!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

setupUser();


