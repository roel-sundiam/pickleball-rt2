import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, CoinTransaction } from '../models';
import { FREE_COINS_FOR_NEW_USER } from '../types/interfaces';

dotenv.config();

const createSuperAdmin = async (): Promise<void> => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.username);
      process.exit(0);
    }

    // Create superadmin user
    const superAdminData = {
      fullName: 'Super Administrator',
      username: 'superadmin',
      email: 'admin@pickleballrt2.com',
      password: 'Admin123!', // Change this password immediately after first login
      gender: 'other' as const,
      homeownerStatus: 'homeowner' as const, // Set as homeowner for admin privileges
      role: 'superadmin' as const,
      isApproved: true,
      membershipFeesPaid: true,
      coinBalance: FREE_COINS_FOR_NEW_USER * 10, // Give extra coins to superadmin
      isActive: true
    };

    const superAdmin = new User(superAdminData);
    await superAdmin.save();

    // Create initial coin transaction for superadmin
    const coinTransaction = new CoinTransaction({
      userId: superAdmin._id,
      type: 'earned',
      amount: FREE_COINS_FOR_NEW_USER * 10,
      description: 'Initial coins for super administrator account',
      status: 'approved'
    });

    await coinTransaction.save();

    console.log('Super admin created successfully!');
    console.log('Username:', superAdmin.username);
    console.log('Email:', superAdmin.email);
    console.log('Password: Admin123! (CHANGE THIS IMMEDIATELY)');
    console.log('Role:', superAdmin.role);
    console.log('Approved:', superAdmin.isApproved);
    console.log('Coin Balance:', superAdmin.coinBalance);

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
createSuperAdmin();