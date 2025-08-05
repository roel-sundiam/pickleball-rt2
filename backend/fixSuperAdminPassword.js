const mongoose = require('mongoose');
require('dotenv').config();

async function fixSuperAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./dist/models/User').default;
    
    const superAdmin = await User.findOne({ role: 'superadmin' });
    if (superAdmin) {
      console.log('Found superadmin:', superAdmin.username);
      
      // Set the password - the pre-save hook will hash it
      superAdmin.password = 'Admin123';
      await superAdmin.save();
      
      console.log('✅ Superadmin password updated to: Admin123');
      
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

fixSuperAdminPassword();