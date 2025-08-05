const mongoose = require('mongoose');
require('dotenv').config();

async function fixUserHomeownerStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./dist/models/User').default;
    
    const user = await User.findOne({ username: 'bo2t' });
    if (user) {
      console.log('Current homeownerStatus:', user.homeownerStatus);
      
      // Set homeowner status if it's missing
      if (!user.homeownerStatus) {
        user.homeownerStatus = 'homeowner'; // Set as homeowner - you can change this
        await user.save();
        console.log('✅ Fixed homeownerStatus for user bo2t - set to: homeowner');
      } else {
        console.log('✅ User already has homeownerStatus:', user.homeownerStatus);
      }
    } else {
      console.log('❌ User bo2t not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixUserHomeownerStatus();