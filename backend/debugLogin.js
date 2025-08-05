const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./dist/models/User').default;
    
    // Find superadmin user
    const superAdmin = await User.findOne({ username: 'superadmin' }).select('+password');
    if (!superAdmin) {
      console.log('Super admin not found');
      return;
    }
    
    console.log('User found:');
    console.log('- Username:', superAdmin.username);
    console.log('- Email:', superAdmin.email);
    console.log('- Role:', superAdmin.role);
    console.log('- Password hash length:', superAdmin.password ? superAdmin.password.length : 'No password');
    console.log('- Has comparePassword method:', typeof superAdmin.comparePassword === 'function');
    
    // Test password comparison
    const testPassword = 'Admin123';
    console.log('Testing password:', testPassword);
    
    if (superAdmin.comparePassword) {
      const isValid = await superAdmin.comparePassword(testPassword);
      console.log('Password comparison result:', isValid);
    } else {
      console.log('comparePassword method not available');
      // Try manual bcrypt comparison
      const isValid = await bcrypt.compare(testPassword, superAdmin.password);
      console.log('Manual bcrypt comparison result:', isValid);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugLogin();