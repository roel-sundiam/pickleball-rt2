import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User, CoinTransaction } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/interfaces';
import { COIN_COSTS } from '../types/interfaces';

// Define available premium features
export enum PremiumFeature {
  ADVANCED_ANALYTICS = 'advanced_analytics',
  EXTENDED_WEATHER = 'extended_weather',
  PRIORITY_BOOKING = 'priority_booking',
  EXPORT_HISTORY = 'export_history',
  CUSTOM_NOTIFICATIONS = 'custom_notifications'
}

export interface PremiumFeatureInfo {
  id: PremiumFeature;
  name: string;
  description: string;
  cost: number;
  duration: number; // in hours, 0 for permanent
  icon: string;
}

// Premium feature definitions
export const PREMIUM_FEATURES: Record<PremiumFeature, PremiumFeatureInfo> = {
  [PremiumFeature.ADVANCED_ANALYTICS]: {
    id: PremiumFeature.ADVANCED_ANALYTICS,
    name: 'Advanced Analytics Dashboard',
    description: 'Detailed analytics with charts, trends, and insights about your court usage patterns',
    cost: COIN_COSTS.PREMIUM_FEATURE,
    duration: 24, // 24 hours access
    icon: '📊'
  },
  [PremiumFeature.EXTENDED_WEATHER]: {
    id: PremiumFeature.EXTENDED_WEATHER,
    name: 'Extended Weather Forecast',
    description: '7-day detailed weather forecast with hourly breakdowns for better planning',
    cost: COIN_COSTS.PREMIUM_FEATURE,
    duration: 168, // 7 days access
    icon: '🌤️'
  },
  [PremiumFeature.PRIORITY_BOOKING]: {
    id: PremiumFeature.PRIORITY_BOOKING,
    name: 'Priority Booking Notifications',
    description: 'Get instant notifications when preferred time slots become available',
    cost: COIN_COSTS.PREMIUM_FEATURE,
    duration: 720, // 30 days access
    icon: '🔔'
  },
  [PremiumFeature.EXPORT_HISTORY]: {
    id: PremiumFeature.EXPORT_HISTORY,
    name: 'Export Reservation History',
    description: 'Export your complete reservation and payment history to PDF or Excel',
    cost: COIN_COSTS.PREMIUM_FEATURE,
    duration: 0, // One-time use
    icon: '📥'
  },
  [PremiumFeature.CUSTOM_NOTIFICATIONS]: {
    id: PremiumFeature.CUSTOM_NOTIFICATIONS,
    name: 'Custom Notification Settings',
    description: 'Advanced notification preferences with custom timing and filters',
    cost: COIN_COSTS.PREMIUM_FEATURE,
    duration: 720, // 30 days access
    icon: '⚙️'
  }
};

// Interface for user premium access
export interface UserPremiumAccess {
  userId: string;
  feature: PremiumFeature;
  purchasedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  transactionId: string;
}

// In-memory store for premium access (in production, use database)
const premiumAccess: Map<string, UserPremiumAccess[]> = new Map();

/**
 * Get all available premium features
 */
export const getPremiumFeatures = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const features = Object.values(PREMIUM_FEATURES);
    
    res.status(200).json({
      success: true,
      data: {
        features,
        userRole: req.user?.role
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching premium features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch premium features',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

/**
 * Purchase/unlock a premium feature
 */
export const unlockPremiumFeature = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { feature } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate feature exists
    const featureInfo = PREMIUM_FEATURES[feature as PremiumFeature];
    if (!featureInfo) {
      res.status(400).json({
        success: false,
        message: 'Invalid premium feature',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Get user to check role and coin balance
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user has sufficient coins (superadmins bypass this check)
    if (user.role !== 'superadmin' && user.coinBalance < featureInfo.cost) {
      res.status(402).json({
        success: false,
        message: `Insufficient coins for ${featureInfo.name}. Required: ${featureInfo.cost}, Available: ${user.coinBalance}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user already has active access to this feature
    const userAccess = premiumAccess.get(userId.toString()) || [];
    const existingAccess = userAccess.find(access => 
      access.feature === feature && 
      access.isActive && 
      (!access.expiresAt || access.expiresAt > new Date())
    );

    if (existingAccess) {
      res.status(409).json({
        success: false,
        message: `You already have active access to ${featureInfo.name}`,
        data: { expiresAt: existingAccess.expiresAt },
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Deduct coins from user balance (skip for superadmins)
    if (user.role !== 'superadmin') {
      user.coinBalance -= featureInfo.cost;
      await user.save();
    }

    // Create coin transaction record
    const coinTransaction = new CoinTransaction({
      userId,
      type: 'spent',
      amount: user.role === 'superadmin' ? 0 : featureInfo.cost,
      description: user.role === 'superadmin' 
        ? `Premium feature: ${featureInfo.name} (Super Admin - No Cost)`
        : `Premium feature: ${featureInfo.name}`,
      referenceId: new Types.ObjectId(), // Generate reference ID for premium access
      status: 'approved'
    });

    await coinTransaction.save();

    // Calculate expiration date
    const purchasedAt = new Date();
    const expiresAt = featureInfo.duration > 0 
      ? new Date(purchasedAt.getTime() + featureInfo.duration * 60 * 60 * 1000)
      : undefined;

    // Grant premium access
    const newAccess: UserPremiumAccess = {
      userId: userId.toString(),
      feature: feature as PremiumFeature,
      purchasedAt,
      expiresAt,
      isActive: true,
      transactionId: coinTransaction._id!.toString()
    };

    // Store access (in production, save to database)
    if (!premiumAccess.has(userId.toString())) {
      premiumAccess.set(userId.toString(), []);
    }
    premiumAccess.get(userId.toString())!.push(newAccess);

    res.status(201).json({
      success: true,
      message: `Successfully unlocked ${featureInfo.name}`,
      data: {
        feature: featureInfo,
        access: newAccess,
        remainingCoins: user.role === 'superadmin' ? 'unlimited' : user.coinBalance
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Error unlocking premium feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock premium feature',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

/**
 * Get user's premium access status
 */
export const getUserPremiumAccess = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const userAccess = premiumAccess.get(userId.toString()) || [];
    
    // Filter active access and add feature info
    const activeAccess = userAccess
      .filter(access => 
        access.isActive && 
        (!access.expiresAt || access.expiresAt > new Date())
      )
      .map(access => ({
        ...access,
        featureInfo: PREMIUM_FEATURES[access.feature]
      }));

    res.status(200).json({
      success: true,
      data: {
        activeFeatures: activeAccess,
        totalActiveFeatures: activeAccess.length
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching user premium access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch premium access',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

/**
 * Check if user has access to a specific premium feature
 */
export const checkPremiumAccess = (userId: string, feature: PremiumFeature): boolean => {
  const userAccess = premiumAccess.get(userId) || [];
  
  return userAccess.some(access => 
    access.feature === feature && 
    access.isActive && 
    (!access.expiresAt || access.expiresAt > new Date())
  );
};

/**
 * Middleware to require premium feature access
 */
export const requirePremiumAccess = (feature: PremiumFeature) => (
  req: AuthenticatedRequest,
  res: Response,
  next: Function
): void => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Superadmins have access to all premium features
  if (req.user?.role === 'superadmin') {
    next();
    return;
  }

  // Check if user has premium access
  if (checkPremiumAccess(userId, feature)) {
    next();
    return;
  }

  const featureInfo = PREMIUM_FEATURES[feature];
  res.status(403).json({
    success: false,
    message: `Premium feature access required: ${featureInfo.name}`,
    data: {
      feature: featureInfo,
      cost: featureInfo.cost
    },
    timestamp: new Date().toISOString()
  } as ApiResponse);
};