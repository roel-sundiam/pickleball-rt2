import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { User } from '../models';

// Extend the Request interface to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId;
    username: string;
    role: string;
    isApproved: boolean;
    coinBalance: number;
  };
}

// Middleware to authenticate JWT token
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔍 AUTH DEBUG - Headers:', req.headers.authorization?.substring(0, 20) + '...');
    
    const token = extractTokenFromHeader(req.headers.authorization);
    console.log('🔍 AUTH DEBUG - Token extracted:', token?.substring(0, 20) + '...');
    
    const decoded = verifyToken(token);
    console.log('🔍 AUTH DEBUG - Token decoded:', { userId: decoded.userId, username: decoded.username, role: decoded.role });

    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('+isActive');
    console.log('🔍 AUTH DEBUG - User found:', user ? { id: user._id, username: user.username, isActive: user.isActive } : 'null');
    
    if (!user || !user.isActive) {
      console.log('❌ AUTH DEBUG - User not found or inactive');
      res.status(401).json({
        success: false,
        message: 'User account not found or inactive'
      });
      return;
    }

    // Add user data to request object
    req.user = {
      _id: user._id as Types.ObjectId,
      username: user.username,
      role: user.role,
      isApproved: user.isApproved,
      coinBalance: user.coinBalance
    };

    console.log('✅ AUTH DEBUG - Authentication successful for:', user.username);
    next();
  } catch (error) {
    console.log('❌ AUTH DEBUG - Error:', error instanceof Error ? error.message : 'Authentication failed');
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

// Middleware to check if user is approved
export const requireApproval = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isApproved) {
    res.status(403).json({
      success: false,
      message: 'Account pending approval. Please wait for admin approval.'
    });
    return;
  }
  next();
};

// Middleware to check if user is superadmin
export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.'
    });
    return;
  }
  next();
};

// Middleware to check if user has sufficient coins
export const requireCoins = (minimumCoins: number) => (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Superadmins have unlimited coins - bypass check
  if (req.user?.role === 'superadmin') {
    next();
    return;
  }

  if (!req.user || req.user.coinBalance < minimumCoins) {
    res.status(402).json({
      success: false,
      message: `Insufficient coins. Required: ${minimumCoins}, Available: ${req.user?.coinBalance || 0}`
    });
    return;
  }
  next();
};