const mongoose = require('mongoose');
require('dotenv').config();

async function fixSuperAdminComplete() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./dist/models/User').default;
    
    const superAdmin = await User.findOne({ role: 'superadmin' });
    if (superAdmin) {
      console.log('Found superadmin:', superAdmin.username);
      console.log('Current homeownerStatus:', superAdmin.homeownerStatus);
      
      // Fix homeowner status first
      if (!superAdmin.homeownerStatus) {
        superAdmin.homeownerStatus = 'homeowner';
        console.log('Setting homeownerStatus to: homeowner');
      }
      
      // Set the password
      superAdmin.password = 'Admin123';
      console.log('Setting password to: Admin123');
      
      await superAdmin.save();
      console.log('✅ Superadmin updated successfully');
      
      // Test the password
      const isValid = await superAdmin.comparePassword('Admin123');
      console.log('Password test result:', isValid);
      
    } else {
      console.log('❌ Superadmin not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixSuperAdminComplete();