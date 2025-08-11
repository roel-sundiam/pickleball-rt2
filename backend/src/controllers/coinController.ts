import { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../models/User';
import CoinTransaction from '../models/CoinTransaction';

interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId;
    username: string;
    role: string;
    isApproved: boolean;
    coinBalance: number;
  };
}

export const getUserBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ coins: user.coinBalance });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({ error: 'Failed to get user balance' });
  }
};

export const requestCoins = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { amount, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid coin amount is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a coin request transaction
    const transaction = new CoinTransaction({
      userId,
      amount,
      type: 'requested',
      status: 'pending',
      description: reason || `User requested ${amount} coins`,
      referenceId: undefined // Let it use the default null value
    });

    await transaction.save();

    res.json({ 
      success: true, 
      message: 'Coin request submitted successfully. An administrator will review your request.',
      requestId: transaction._id
    });
  } catch (error) {
    console.error('Error requesting coins:', error);
    res.status(500).json({ error: 'Failed to submit coin request' });
  }
};

export const getUserPendingRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find all pending coin requests for this user
    const pendingRequests = await CoinTransaction.find({
      userId: userId,
      type: 'requested',
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Error getting user pending requests:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
};

export const submitPurchaseRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 COIN DEBUG - Purchase request received');
    console.log('🔍 COIN DEBUG - req.user:', req.user);
    console.log('🔍 COIN DEBUG - req.body:', req.body);
    
    const userId = req.user?._id;
    const { coinAmount, paymentMethod, referenceNumber, buyerName, phoneNumber, totalCost } = req.body;

    if (!userId) {
      console.log('❌ COIN DEBUG - No userId found in req.user');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!coinAmount || !paymentMethod || !buyerName || !phoneNumber || !totalCost) {
      return res.status(400).json({ error: 'Coin amount, payment method, buyer name, phone number, and total cost are required' });
    }

    // Validate payment method
    if (paymentMethod !== 'gcash' && paymentMethod !== 'bank') {
      return res.status(400).json({ error: 'Payment method must be either "gcash" or "bank"' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate that total cost matches expected (₱1 per coin)
    const expectedCost = coinAmount * 1;
    if (totalCost !== expectedCost) {
      return res.status(400).json({ error: `Invalid total cost. Expected ₱${expectedCost} for ${coinAmount} coins` });
    }

    // Create a purchase request transaction
    const transaction = new CoinTransaction({
      userId,
      amount: coinAmount,
      type: 'requested',
      status: 'pending',
      description: `${paymentMethod.toUpperCase()} Purchase: ${coinAmount} coins for ₱${totalCost} | Method: ${paymentMethod} | Ref: ${referenceNumber || 'Not provided'} | Buyer: ${buyerName} | Phone: ${phoneNumber}`,
      referenceId: undefined // Let it use the default null value since we're using description for reference info
    });

    await transaction.save();

    res.json({ 
      success: true, 
      message: 'Purchase request submitted successfully. Payment will be verified and coins credited within 24 hours.',
      requestId: transaction._id
    });
  } catch (error) {
    console.error('Error submitting purchase request:', error);
    res.status(500).json({ error: 'Failed to submit purchase request' });
  }
};

export const getCoinBalanceStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is superadmin
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin role required.' });
    }

    // Get all users with their coin balances
    const users = await User.find({}, {
      _id: 1,
      username: 1,
      fullName: 1,
      email: 1,
      coinBalance: 1,
      homeownerStatus: 1,
      isApproved: 1
    }).sort({ coinBalance: -1 });

    // Calculate statistics
    const totalUsers = users.length;
    const totalCoinsInSystem = users.reduce((sum, user) => sum + (user.coinBalance || 0), 0);
    const averageCoinsPerUser = totalUsers > 0 ? Math.round(totalCoinsInSystem / totalUsers * 100) / 100 : 0;
    const usersWithCoins = users.filter(user => (user.coinBalance || 0) > 0).length;
    const usersWithoutCoins = totalUsers - usersWithCoins;

    // Get top 10 users by coin balance
    const topUsers = users.slice(0, 10);

    // Distribution statistics
    const coinDistribution = {
      'No coins (0)': users.filter(user => (user.coinBalance || 0) === 0).length,
      'Low (1-50)': users.filter(user => (user.coinBalance || 0) > 0 && (user.coinBalance || 0) <= 50).length,
      'Medium (51-200)': users.filter(user => (user.coinBalance || 0) > 50 && (user.coinBalance || 0) <= 200).length,
      'High (201-500)': users.filter(user => (user.coinBalance || 0) > 200 && (user.coinBalance || 0) <= 500).length,
      'Very High (500+)': users.filter(user => (user.coinBalance || 0) > 500).length
    };

    // Homeowner vs Non-homeowner breakdown
    const homeownerStats = {
      homeowner: {
        count: users.filter(user => user.homeownerStatus === 'homeowner').length,
        totalCoins: users.filter(user => user.homeownerStatus === 'homeowner').reduce((sum, user) => sum + (user.coinBalance || 0), 0)
      },
      nonHomeowner: {
        count: users.filter(user => user.homeownerStatus === 'non-homeowner').length,
        totalCoins: users.filter(user => user.homeownerStatus === 'non-homeowner').reduce((sum, user) => sum + (user.coinBalance || 0), 0)
      }
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCoinsInSystem,
          averageCoinsPerUser,
          usersWithCoins,
          usersWithoutCoins
        },
        topUsers,
        coinDistribution,
        homeownerStats,
        allUsers: users
      }
    });

  } catch (error) {
    console.error('Error getting coin balance statistics:', error);
    res.status(500).json({ error: 'Failed to get coin balance statistics' });
  }
};