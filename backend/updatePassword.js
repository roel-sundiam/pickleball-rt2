const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./dist/models/User').default;
    
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      console.log('Super admin not found');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    superAdmin.password = hashedPassword;
    await superAdmin.save();
    
    console.log('Password updated to: Admin123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updatePassword();