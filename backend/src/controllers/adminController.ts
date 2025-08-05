import { Request, Response } from 'express';
import { User, CoinTransaction } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, PaginatedResponse } from '../types/interfaces';

// Get all users with pagination and filtering
export const getAllUsersAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string; // 'pending', 'approved', 'all'
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (status === 'pending') {
      filter.isApproved = false;
    } else if (status === 'approved') {
      filter.isApproved = true;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ registrationDate: -1 })
      .skip(skip)
      .limit(limit);

    const response: PaginatedResponse = {
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Get all users admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get user details by ID
export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Approve user
export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (user.isApproved) {
      res.status(400).json({
        success: false,
        message: 'User is already approved',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Approve the user
    user.isApproved = true;
    await user.save();

    // Create a coin transaction for approval notification (optional)
    const coinTransaction = new CoinTransaction({
      userId: user._id,
      type: 'earned',
      amount: 0, // No additional coins, just a record
      description: 'Account approved by administrator',
      status: 'approved'
    });

    await coinTransaction.save();

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Reject/deactivate user
export const rejectUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Deactivate the user instead of deleting
    user.isActive = false;
    user.isApproved = false;
    await user.save();

    // Create a coin transaction for rejection notification
    const coinTransaction = new CoinTransaction({
      userId: user._id,
      type: 'earned',
      amount: 0,
      description: `Account rejected by administrator. Reason: ${reason || 'No reason provided'}`,
      status: 'rejected'
    });

    await coinTransaction.save();

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Update membership fee status
export const updateMembershipFeeStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { membershipFeesPaid } = req.body;

    if (typeof membershipFeesPaid !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'membershipFeesPaid must be a boolean value',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    user.membershipFeesPaid = membershipFeesPaid;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Membership fee status updated successfully`,
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Update membership fee status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update membership fee status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get user statistics
export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ isApproved: false, isActive: true });
    const approvedUsers = await User.countDocuments({ isApproved: true, isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const feesPaidUsers = await User.countDocuments({ membershipFeesPaid: true });

    const stats = {
      totalUsers,
      pendingUsers,
      approvedUsers,
      inactiveUsers,
      feesPaidUsers,
      recentRegistrations: await User.find({ isActive: true })
        .select('fullName username registrationDate isApproved')
        .sort({ registrationDate: -1 })
        .limit(5)
    };

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Bulk approve users
export const bulkApproveUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Update users
    const result = await User.updateMany(
      { 
        _id: { $in: userIds },
        isApproved: false,
        isActive: true
      },
      { isApproved: true }
    );

    // Create coin transactions for approved users
    const approvedUsers = await User.find({ _id: { $in: userIds }, isApproved: true });
    const coinTransactions = approvedUsers.map(user => ({
      userId: user._id,
      type: 'earned' as const,
      amount: 0,
      description: 'Account approved by administrator (bulk approval)',
      status: 'approved' as const
    }));

    if (coinTransactions.length > 0) {
      await CoinTransaction.insertMany(coinTransactions);
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users approved successfully`,
      data: { approvedCount: result.modifiedCount },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Bulk approve users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve users',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Grant coins to a user
export const grantCoins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Add coins to user balance
    user.coinBalance += amount;
    await user.save();

    // Create coin transaction record
    const coinTransaction = new CoinTransaction({
      userId,
      type: 'granted',
      amount,
      description: reason || `Admin granted ${amount} coins`,
      status: 'approved'
    });

    await coinTransaction.save();

    res.status(200).json({
      success: true,
      message: `Successfully granted ${amount} coins to ${user.fullName}`,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          coinBalance: user.coinBalance
        },
        transaction: coinTransaction
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Grant coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant coins',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Deduct coins from a user
export const deductCoins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user has sufficient coins
    if (user.coinBalance < amount) {
      res.status(400).json({
        success: false,
        message: `Insufficient coins. User has ${user.coinBalance} coins, trying to deduct ${amount}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Deduct coins from user balance
    user.coinBalance -= amount;
    await user.save();

    // Create coin transaction record
    const coinTransaction = new CoinTransaction({
      userId,
      type: 'spent',
      amount,
      description: reason || `Admin deducted ${amount} coins`,
      status: 'approved'
    });

    await coinTransaction.save();

    res.status(200).json({
      success: true,
      message: `Successfully deducted ${amount} coins from ${user.fullName}`,
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          coinBalance: user.coinBalance
        },
        transaction: coinTransaction
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Deduct coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deduct coins',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get system-wide coin statistics (admin only)
export const getCoinStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get total coins in circulation
    const totalCoinsResult = await User.aggregate([
      { $group: { _id: null, totalCoins: { $sum: '$coinBalance' } } }
    ]);

    // Get total coins earned/spent by type
    const transactionStats = await CoinTransaction.aggregate([
      { 
        $group: { 
          _id: '$type', 
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top coin holders (excluding superadmins)
    const topHolders = await User.find({ role: 'member' })
      .sort({ coinBalance: -1 })
      .limit(10)
      .select('fullName username coinBalance');

    // Get recent transactions
    const recentTransactions = await CoinTransaction.find()
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        totalCoinsInCirculation: totalCoinsResult[0]?.totalCoins || 0,
        transactionStatistics: transactionStats,
        topCoinHolders: topHolders,
        recentTransactions
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get coin statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get coin statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get pending coin requests (admin only)
export const getPendingCoinRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pendingRequests = await CoinTransaction.find({ 
      type: 'requested',
      status: 'pending'
    })
    .populate('userId', 'fullName username coinBalance')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pendingRequests,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get pending coin requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending coin requests',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Approve coin request (admin only)
export const approveCoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;

    const coinRequest = await CoinTransaction.findById(requestId).populate('userId');
    if (!coinRequest) {
      res.status(404).json({
        success: false,
        message: 'Coin request not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (coinRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Coin request has already been processed',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Update user's coin balance
    const user = await User.findById(coinRequest.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    user.coinBalance += coinRequest.amount;
    await user.save();

    // Update coin request status
    coinRequest.status = 'approved';
    await coinRequest.save();

    // Create a granted transaction record
    const grantedTransaction = new CoinTransaction({
      userId: coinRequest.userId,
      amount: coinRequest.amount,
      type: 'granted',
      status: 'approved',
      description: `Admin approved coin request: ${coinRequest.description}`,
      referenceId: requestId
    });
    await grantedTransaction.save();

    res.status(200).json({
      success: true,
      message: `Successfully granted ${coinRequest.amount} coins to ${user.fullName}`,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          newBalance: user.coinBalance
        },
        transaction: grantedTransaction
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Approve coin request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve coin request',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Reject coin request (admin only)
export const rejectCoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const coinRequest = await CoinTransaction.findById(requestId).populate('userId');
    if (!coinRequest) {
      res.status(404).json({
        success: false,
        message: 'Coin request not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (coinRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Coin request has already been processed',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Update coin request status and add rejection reason
    coinRequest.status = 'rejected';
    if (reason) {
      coinRequest.description += ` | Rejection reason: ${reason}`;
    }
    await coinRequest.save();

    const user = coinRequest.userId as any;
    res.status(200).json({
      success: true,
      message: `Coin request from ${user.fullName} has been rejected`,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName
        },
        rejectionReason: reason || 'No reason provided'
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Reject coin request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject coin request',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};