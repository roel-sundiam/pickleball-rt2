const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

async function debugProduction() {
  try {
    console.log('🔍 Starting production debugging...');
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('- JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
    
    // Connect to database
    console.log('\n🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    // Check if User model exists
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Find superadmin user
    console.log('\n👤 Checking superadmin user...');
    const superadmin = await User.findOne({ username: 'superadmin' }).select('+password');
    
    if (!superadmin) {
      console.log('❌ Superadmin user not found');
    } else {
      console.log('✅ Superadmin user found:');
      console.log('- ID:', superadmin._id);
      console.log('- Username:', superadmin.username);
      console.log('- Role:', superadmin.role);
      console.log('- Is Approved:', superadmin.isApproved);
      console.log('- Is Active:', superadmin.isActive);
      console.log('- Has Password:', !!superadmin.password);
      console.log('- Password Hash Length:', superadmin.password?.length || 0);
      
      // Test password comparison
      console.log('\n🔐 Testing password comparison...');
      try {
        const isPasswordValid = await bcrypt.compare('Admin123', superadmin.password);
        console.log('- Password "Admin123" valid:', isPasswordValid);
      } catch (error) {
        console.log('- Password comparison error:', error.message);
      }
    }
    
    // Check database connection
    console.log('\n📊 Database stats:');
    const userCount = await User.countDocuments();
    console.log('- Total users:', userCount);
    
    const activeUsers = await User.countDocuments({ isActive: true });
    console.log('- Active users:', activeUsers);
    
    const approvedUsers = await User.countDocuments({ isApproved: true });
    console.log('- Approved users:', approvedUsers);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database disconnected');
  }
}

// Run the debug function
debugProduction().catch(console.error);