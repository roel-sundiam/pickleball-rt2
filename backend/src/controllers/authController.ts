import { Request, Response } from 'express';
import { User, CoinTransaction } from '../models';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  UserRegistration, 
  LoginCredentials, 
  AuthResponse, 
  ApiResponse,
  FREE_COINS_FOR_NEW_USER 
} from '../types/interfaces';

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrationData: UserRegistration = req.body;
    
    // Detailed logging for debugging
    console.log('Full registration data:', JSON.stringify(registrationData, null, 2));
    console.log('homeownerStatus field:', registrationData.homeownerStatus);
    console.log('homeownerStatus type:', typeof registrationData.homeownerStatus);

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: registrationData.username.toLowerCase() },
        { email: registrationData.email.toLowerCase() }
      ]
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Username or email already exists',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Create new user
    const user = new User({
      fullName: registrationData.fullName,
      username: registrationData.username.toLowerCase(),
      email: registrationData.email.toLowerCase(),
      password: registrationData.password,
      gender: registrationData.gender,
      phoneNumber: registrationData.phoneNumber,
      dateOfBirth: registrationData.dateOfBirth,
      homeownerStatus: registrationData.homeownerStatus,
      coinBalance: FREE_COINS_FOR_NEW_USER
    });

    await user.save();

    // Create initial coin transaction for free coins
    const coinTransaction = new CoinTransaction({
      userId: user._id,
      type: 'earned',
      amount: FREE_COINS_FOR_NEW_USER,
      description: 'Welcome bonus - free coins for new user',
      status: 'approved'
    });

    await coinTransaction.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: userResponse,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: LoginCredentials = req.body;

    // Find user by username and include password for comparison
    const user = await User.findOne({ 
      username: credentials.username.toLowerCase() 
    }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(credentials.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id as any, user.username, user.role);

    // Prepare response
    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    const authResponse: AuthResponse = {
      user: userResponse as any,
      token,
      expiresIn: process.env.JWT_EXPIRE || '7d'
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authResponse,
      timestamp: new Date().toISOString()
    } as ApiResponse<AuthResponse>);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get current user profile
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    
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
      message: 'Profile retrieved successfully',
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Update user profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const allowedUpdates = ['fullName', 'phoneNumber', 'dateOfBirth', 'profilePicture'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        message: 'Invalid updates. Only fullName, phoneNumber, dateOfBirth, and profilePicture can be updated.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      req.body,
      { new: true, runValidators: true }
    );

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
      message: 'Profile updated successfully',
      data: user,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Change password
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get all approved users (for player selection in reservations)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Only return approved, active users for player selection
    const users = await User.find({
      isApproved: true,
      isActive: true
    })
    .select('_id fullName username email')
    .sort({ fullName: 1 });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};