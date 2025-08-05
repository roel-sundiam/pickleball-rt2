const mongoose = require('mongoose');

require('dotenv').config();

async function fixPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./dist/models/User').default;
    
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      console.log('Super admin not found');
      return;
    }
    
    // Set the plain text password - the pre-save hook will hash it
    superAdmin.password = 'Admin123';
    await superAdmin.save();
    
    console.log('Password fixed. Testing login...');
    
    // Test the password
    const isValid = await superAdmin.comparePassword('Admin123');
    console.log('Password test result:', isValid);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixPassword();