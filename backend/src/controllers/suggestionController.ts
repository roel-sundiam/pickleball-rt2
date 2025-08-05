import { Response } from 'express';
import { Types } from 'mongoose';
import { Suggestion } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  SuggestionRequest, 
  ApiResponse,
  Suggestion as SuggestionInterface 
} from '../types/interfaces';

// Create a new suggestion/complaint
export const createSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suggestionData: SuggestionRequest = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Create new suggestion
    const suggestion = new Suggestion({
      userId,
      category: suggestionData.category,
      priority: suggestionData.priority || 'medium',
      title: suggestionData.title,
      description: suggestionData.description,
      attachments: suggestionData.attachments || [],
      status: 'open'
    });

    await suggestion.save();

    // Populate user information for response
    await suggestion.populate('userId', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Suggestion submitted successfully',
      data: suggestion.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create suggestion',
      timestamp: new Date().toISOString()
    });
  }
};

// Get all suggestions (superadmin only)
export const getAllSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suggestions = await Suggestion.find()
      .populate('userId', 'username fullName')
      .populate('respondedBy', 'username fullName')
      .sort({ createdAt: -1 });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Suggestions retrieved successfully',
      data: suggestions,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get all suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve suggestions',
      timestamp: new Date().toISOString()
    });
  }
};

// Get user's own suggestions
export const getUserSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const suggestions = await Suggestion.find({ userId })
      .populate('userId', 'username fullName')
      .populate('respondedBy', 'username fullName')
      .sort({ createdAt: -1 });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'User suggestions retrieved successfully',
      data: suggestions,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get user suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user suggestions',
      timestamp: new Date().toISOString()
    });
  }
};

// Update suggestion status and add admin response (superadmin only)
export const updateSuggestionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    const adminUserId = req.user?._id?.toString();

    if (!adminUserId) {
      res.status(401).json({
        success: false,
        message: 'Admin not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const suggestion = await Suggestion.findById(id);
    
    if (!suggestion) {
      res.status(404).json({
        success: false,
        message: 'Suggestion not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Update suggestion
    suggestion.status = status;
    if (adminResponse) {
      suggestion.response = adminResponse;
      suggestion.respondedBy = new Types.ObjectId(adminUserId);
      suggestion.respondedAt = new Date();
    }

    await suggestion.save();

    // Populate for response
    await suggestion.populate('userId', 'username fullName');
    await suggestion.populate('respondedBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Suggestion updated successfully',
      data: suggestion.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update suggestion status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update suggestion',
      timestamp: new Date().toISOString()
    });
  }
};

// Delete suggestion (superadmin only)
export const deleteSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const suggestion = await Suggestion.findByIdAndDelete(id);
    
    if (!suggestion) {
      res.status(404).json({
        success: false,
        message: 'Suggestion not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Suggestion deleted successfully',
      data: null,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete suggestion',
      timestamp: new Date().toISOString()
    });
  }
};