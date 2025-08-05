import express from 'express';
import adminRoutes from './src/routes/adminRoutes';

console.log('Testing admin routes with ts-node...');

try {
  const app = express();
  
  console.log('Admin routes object type:', typeof adminRoutes);
  console.log('Admin routes is function:', typeof adminRoutes === 'function');
  
  // Test mounting the routes
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes mounted successfully');
  
  // Start server
  const server = app.listen(3001, () => {
    console.log('✅ Test server running on port 3001');
    console.log('Test endpoint: http://localhost:3001/api/admin/users/stats');
    
    // Close server after test
    setTimeout(() => {
      server.close();
      console.log('Test server closed');
      process.exit(0);
    }, 2000);
  });
  
} catch (error) {
  console.error('❌ Error:', error);
}