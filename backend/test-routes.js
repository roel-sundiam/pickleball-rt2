const express = require('express');

// Test importing admin routes
try {
  console.log('Testing admin routes import...');
  const adminRoutes = require('./dist/routes/adminRoutes');
  console.log('✅ Admin routes imported successfully');
  console.log('Admin routes object:', typeof adminRoutes.default);
  
  // Test importing admin controller
  const adminController = require('./dist/controllers/adminController');
  console.log('✅ Admin controller imported successfully');
  console.log('Available functions:', Object.keys(adminController));
  
  // Test creating express app with admin routes
  const app = express();
  app.use('/api/admin', adminRoutes.default);
  console.log('✅ Express app created with admin routes');
  
  // List routes
  console.log('\nRegistered routes:');
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(r.route.path)
    }
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}