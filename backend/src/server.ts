import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Security middleware with custom CSP for gallery images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "*"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      frameSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for gallery uploads with custom headers
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Static uploads path:', uploadsPath);
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Pickleball Court Schedule API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check paths
app.get('/api/debug-paths', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, '../uploads');
  const testFilePath = path.join(uploadsPath, 'test.txt');
  
  res.json({
    __dirname,
    uploadsPath,
    testFilePath,
    uploadsExists: fs.existsSync(uploadsPath),
    testFileExists: fs.existsSync(testFilePath),
    uploadsContent: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : null,
    timestamp: new Date().toISOString()
  });
});

// Import routes
import authRoutes from './routes/authRoutes';
import reservationRoutes from './routes/reservationRoutes';
import weatherRoutes from './routes/weatherRoutes';
import adminRoutes from './routes/adminRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import paymentRoutes from './routes/paymentRoutes';
import suggestionRoutes from './routes/suggestionRoutes';
import galleryRoutes from './routes/galleryRoutes';
import analyticsRoutes from './routes/analytics';
import premiumRoutes from './routes/premium';
import coinRoutes from './routes/coinRoutes';
import pollRoutes from './routes/pollRoutes';

// Debug logging
console.log('🔍 Debug: Importing routes...');
console.log('Auth routes type:', typeof authRoutes);
console.log('Reservation routes type:', typeof reservationRoutes);
console.log('Weather routes type:', typeof weatherRoutes);
console.log('Admin routes type:', typeof adminRoutes);
console.log('Schedule routes type:', typeof scheduleRoutes);
console.log('Payment routes type:', typeof paymentRoutes);

// More detailed debug for payment routes
if (typeof paymentRoutes === 'function') {
  console.log('✅ Payment routes imported successfully');
} else {
  console.log('❌ Payment routes import failed - type:', typeof paymentRoutes);
  console.log('Payment routes value:', paymentRoutes);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/polls', pollRoutes);

console.log('✅ All routes mounted successfully');

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 GLOBAL ERROR HANDLER - Error caught:');
  console.error('🔥 URL:', req.method, req.url);
  console.error('🔥 Error:', err);
  console.error('🔥 Stack:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});// trigger restart
