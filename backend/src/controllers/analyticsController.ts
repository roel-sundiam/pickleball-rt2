import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PageVisit, User, CoinTransaction } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/interfaces';
import { COIN_COSTS } from '../types/interfaces';

// Track a page visit and deduct coins (if not superadmin)
export const trackPageVisit = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageName, url, sessionId, userAgent, coinCost } = req.body;
    const userId = req.user?._id;

    // Enhanced validation
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate required fields
    const requiredUrl = url || req.headers.referer || req.originalUrl || '';
    const requiredSessionId = sessionId || (req as any).sessionID || `session-${Date.now()}`;
    const requiredPageName = pageName || 'Unknown Page';

    console.log('🔍 Debug - Page visit tracking:', {
      userId: userId.toString(),
      pageName: requiredPageName,
      url: requiredUrl,
      sessionId: requiredSessionId,
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown'
    });

    // Get user to check role and coin balance
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found for ID:', userId.toString());
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    console.log('✅ User found:', { username: user.username, role: user.role, coinBalance: user.coinBalance });

    // Determine the coin cost to use (from request or fallback to default)
    const actualCoinCost = coinCost ?? COIN_COSTS.PAGE_VISIT;
    
    // Check if user has sufficient coins (superadmins bypass this check)
    if (user.role !== 'superadmin' && user.coinBalance < actualCoinCost) {
      res.status(402).json({
        success: false,
        message: `Insufficient coins for page visit. Required: ${actualCoinCost}, Available: ${user.coinBalance}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Create page visit record with better error handling
    try {
      const pageVisit = new PageVisit({
        userId,
        pageName: requiredPageName,
        url: requiredUrl,
        sessionId: requiredSessionId,
        userAgent: userAgent || req.headers['user-agent'] || 'unknown',
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        coinsConsumed: user.role === 'superadmin' ? 0 : actualCoinCost,
        timestamp: new Date()
      });

      console.log('💾 Attempting to save page visit...');
      await pageVisit.save();
      console.log('✅ Page visit saved successfully:', pageVisit._id);

      // Deduct coins from user balance (skip for superadmins)
      if (user.role !== 'superadmin') {
        console.log('💰 Deducting coins from user balance...');
        user.coinBalance -= actualCoinCost;
        await user.save();
        console.log('✅ User coin balance updated:', user.coinBalance);

        // Create coin transaction record
        const coinTransaction = new CoinTransaction({
          userId,
          type: 'spent',
          amount: actualCoinCost,
          description: `Page visit: ${requiredPageName} (${actualCoinCost} coins)`,
          referenceId: pageVisit._id,
          status: 'approved'
        });

        await coinTransaction.save();
        console.log('✅ Coin transaction saved');
      } else {
        // Create coin transaction record for superadmin (0 cost)
        const coinTransaction = new CoinTransaction({
          userId,
          type: 'spent',
          amount: 0,
          description: `Page visit: ${requiredPageName} (Super Admin - No Cost)`,
          referenceId: pageVisit._id,
          status: 'approved'
        });

        await coinTransaction.save();
        console.log('✅ Superadmin coin transaction saved (0 cost)');
      }

      res.status(201).json({
        success: true,
        message: 'Page visit tracked successfully',
        data: {
          pageVisit: {
            _id: pageVisit._id,
            pageName: pageVisit.pageName,
            url: pageVisit.url,
            coinsConsumed: pageVisit.coinsConsumed,
            timestamp: pageVisit.timestamp
          },
          remainingCoins: user.role === 'superadmin' ? 'unlimited' : user.coinBalance
        },
        timestamp: new Date().toISOString()
      } as ApiResponse);

    } catch (dbError) {
      console.error('❌ Database error in page visit creation:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('❌ Error tracking page visit:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to track page visit',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get page visit analytics (superadmin only)
export const getPageVisitAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { startDate, endDate, limit = 100 } = req.query;

    // Restrict access to superadmin only
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Basic analytics query - exclude superadmin users from all statistics
    const matchQuery: any = {};
    
    if (startDate && endDate) {
      matchQuery.timestamp = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Use aggregation to exclude superadmin users from page visits
    const pageVisitsAgg = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $sort: { timestamp: -1 } },
      { $limit: parseInt(limit as string) },
      {
        $project: {
          _id: 1,
          pageName: 1,
          url: 1,
          coinsConsumed: 1,
          timestamp: 1,
          userId: {
            _id: '$user._id',
            username: '$user.username',
            fullName: '$user.fullName'
          }
        }
      }
    ]);

    const pageVisits = pageVisitsAgg;

    // Get summary statistics - exclude superadmin users
    const totalVisitsAgg = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $count: 'totalVisits' }
    ]);
    const totalVisits = totalVisitsAgg.length > 0 ? totalVisitsAgg[0].totalVisits : 0;

    const totalCoinsSpent = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $group: { _id: null, total: { $sum: '$coinsConsumed' } } }
    ]);

    // Get top pages - exclude superadmin visits
    const topPages = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $group: { _id: '$pageName', visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
      { $limit: 10 }
    ]);

    // Get top users - exclude superadmin users
    const topUsers = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $group: { _id: '$userId', visits: { $sum: 1 }, totalCoins: { $sum: '$coinsConsumed' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
      { $unwind: '$userDetails' },
      { $project: { visits: 1, totalCoins: 1, username: '$userDetails.username', fullName: '$userDetails.fullName' } },
      { $sort: { visits: -1 } },
      { $limit: 10 }
    ]);

    // Get unique pages count - exclude superadmin visits
    const uniquePages = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $group: { _id: '$pageName' } },
      { $count: 'totalUniquePages' }
    ]);

    // Get unique visitors/users count - exclude superadmin users
    const uniqueVisitors = await PageVisit.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': { $ne: 'superadmin' } } },
      { $group: { _id: '$userId' } },
      { $count: 'totalUniqueVisitors' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        visits: pageVisits,
        summary: {
          totalVisits,
          totalCoinsSpent: totalCoinsSpent[0]?.total || 0,
          totalUniquePages: uniquePages[0]?.totalUniquePages || 0,
          totalUniqueVisitors: uniqueVisitors[0]?.totalUniqueVisitors || 0,
          topPages: topPages.map(p => ({ page: p._id, visits: p.visits })),
          topUsers: topUsers.map(u => ({ 
            username: u.username, 
            fullName: u.fullName, 
            visits: u.visits, 
            totalCoins: u.totalCoins 
          }))
        }
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching page visit analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get user's page visit history
export const getUserPageVisitHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { limit = 50 } = req.query;

    const pageVisits = await PageVisit.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .select('pageName url coinsConsumed timestamp');

    const totalVisits = await PageVisit.countDocuments({ userId });
    const totalCoinsSpent = await PageVisit.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$coinsConsumed' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        visits: pageVisits,
        summary: {
          totalVisits,
          totalCoinsSpent: totalCoinsSpent[0]?.total || 0
        }
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Error fetching user page visit history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch page visit history',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};