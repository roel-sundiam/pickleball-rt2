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
    const { coinAmount, gcashReference, buyerName, phoneNumber, totalCost } = req.body;

    if (!userId) {
      console.log('❌ COIN DEBUG - No userId found in req.user');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!coinAmount || !buyerName || !phoneNumber || !totalCost) {
      return res.status(400).json({ error: 'Coin amount, buyer name, phone number, and total cost are required' });
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
      description: `GCash Purchase: ${coinAmount} coins for ₱${totalCost} | Ref: ${gcashReference || 'Not provided'} | Buyer: ${buyerName} | Phone: ${phoneNumber}`,
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