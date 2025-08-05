import { Response } from 'express';
import { Types } from 'mongoose';
import { Poll } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  Poll as PollInterface,
  PollVote,
  ApiResponse 
} from '../types/interfaces';

// Create a new poll (superadmin only)
export const createPoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, options, startDate, endDate } = req.body;
    const createdBy = req.user?._id?.toString();

    if (!createdBy) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate poll data
    if (!title || !description || !options || !Array.isArray(options)) {
      res.status(400).json({
        success: false,
        message: 'Title, description, and options are required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (options.length < 2 || options.length > 10) {
      res.status(400).json({
        success: false,
        message: 'Poll must have between 2 and 10 options',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate dates and handle Philippine Standard Time (UTC+8)
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(endDate);
    
    // Log timezone information for debugging
    console.log('Poll creation timezone debug:');
    console.log(`Start date received: ${startDate || 'now'}`);
    console.log(`End date received: ${endDate}`);
    console.log(`Parsed start: ${start.toISOString()} (${start.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT)`);
    console.log(`Parsed end: ${end.toISOString()} (${end.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT)`);
    
    if (end <= start) {
      res.status(400).json({
        success: false,
        message: 'End date must be after start date',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Create poll options with proper structure
    const pollOptions = options.map((option: any) => ({
      text: option.text || option,
      votes: 0,
      voters: []
    }));

    // Create new poll
    const poll = new Poll({
      title,
      description,
      options: pollOptions,
      createdBy: new Types.ObjectId(createdBy),
      startDate: start,
      endDate: end,
      isActive: true,
      votedUsers: []
    });

    await poll.save();

    // Populate creator information for response
    await poll.populate('createdBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Poll created successfully',
      data: poll.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create poll',
      timestamp: new Date().toISOString()
    });
  }
};

// Get all active polls
export const getAllActivePolls = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    
    const polls = await Poll.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Active polls retrieved successfully',
      data: polls,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get active polls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve polls',
      timestamp: new Date().toISOString()
    });
  }
};

// Get single poll by ID (for editing)
export const getPollById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('getPollById called with ID:', req.params.id);
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    const pollId = req.params.id;

    if (!pollId) {
      res.status(400).json({
        success: false,
        message: 'Poll ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const poll = await Poll.findById(pollId)
      .populate('createdBy', 'username fullName');

    if (!poll) {
      res.status(404).json({
        success: false,
        message: 'Poll not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      message: 'Poll retrieved successfully',
      data: poll.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get poll by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve poll',
      timestamp: new Date().toISOString()
    });
  }
};

// Vote on a poll (members only, no duplicate votes)
export const voteOnPoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!optionId) {
      res.status(400).json({
        success: false,
        message: 'Option ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const poll = await Poll.findById(id);
    
    if (!poll) {
      res.status(404).json({
        success: false,
        message: 'Poll not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if poll is active and within date range
    const now = new Date();
    if (!poll.isActive || poll.startDate > now || poll.endDate < now) {
      res.status(400).json({
        success: false,
        message: 'Poll is not currently active',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user has already voted
    const userObjectId = new Types.ObjectId(userId);
    if (poll.votedUsers.includes(userObjectId)) {
      res.status(400).json({
        success: false,
        message: 'You have already voted on this poll',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find the option to vote for
    const optionIndex = poll.options.findIndex(option => option._id?.toString() === optionId);
    
    if (optionIndex === -1) {
      res.status(400).json({
        success: false,
        message: 'Invalid option ID',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add vote to option
    poll.options[optionIndex].votes += 1;
    (poll.options[optionIndex].voters as any).push(userObjectId);
    
    // Add user to voted users list
    poll.votedUsers.push(userObjectId);

    await poll.save();

    // Populate for response
    await poll.populate('createdBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Vote cast successfully',
      data: poll.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Vote on poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      timestamp: new Date().toISOString()
    });
  }
};

// Get poll results by ID
export const getPollResults = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const poll = await Poll.findById(id)
      .populate('createdBy', 'username fullName');
    
    if (!poll) {
      res.status(404).json({
        success: false,
        message: 'Poll not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Calculate total votes
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    
    // Add percentage to each option
    const optionsWithPercentage = poll.options.map(option => ({
      ...(option as any).toObject(),
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
    }));

    const pollData = {
      ...poll.toObject(),
      options: optionsWithPercentage,
      totalVotes,
      isCurrentlyActive: poll.isActive && poll.startDate <= new Date() && poll.endDate >= new Date()
    };

    const response: ApiResponse<any> = {
      success: true,
      message: 'Poll results retrieved successfully',
      data: pollData,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve poll results',
      timestamp: new Date().toISOString()
    });
  }
};

// Update poll (superadmin only)
export const updatePoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, options, isActive } = req.body;
    
    // Debug logging
    console.log('🔄 UPDATE POLL DEBUG:');
    console.log('Poll ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Start date received:', startDate, typeof startDate);
    console.log('End date received:', endDate, typeof endDate);
    console.log('Options received:', JSON.stringify(options, null, 2));

    const poll = await Poll.findById(id);
    
    if (!poll) {
      res.status(404).json({
        success: false,
        message: 'Poll not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Debug what we actually received
    console.log('=== BACKEND DEBUG ===');
    console.log('title:', title);
    console.log('startDate:', startDate);
    console.log('options:', options);
    console.log('==================');
    
    // Update title if provided
    if (title !== undefined && title !== null) {
      poll.title = title.trim();
    }
    
    // Update description if provided
    if (description !== undefined && description !== null) {
      poll.description = description.trim();
    }
    
    // Handle startDate - support clearing it (empty string should clear to null)
    console.log('🔍 StartDate check:', { startDate, hasStartDate: 'startDate' in req.body });
    if (startDate !== undefined) {
      console.log('✅ StartDate updating...');
      if (startDate === '' || startDate === null) {
        // Clear start date (immediate start)
        console.log('🔄 Clearing startDate to current time');
        poll.startDate = new Date();
      } else {
        console.log('🔄 Setting startDate to:', startDate);
        poll.startDate = new Date(startDate);
      }
    } else {
      console.log('⚠️ StartDate is undefined, not updating');
    }
    
    // Update endDate if provided
    if (endDate !== undefined && endDate !== null) {
      poll.endDate = new Date(endDate);
    }
    
    // Handle options update - preserve existing voting data where possible
    console.log('🔍 Options check:', { options, hasOptions: 'options' in req.body, isArray: Array.isArray(options) });
    if (options && Array.isArray(options)) {
      console.log('✅ Options updating...');
      const existingOptions = poll.options;
      console.log('📋 Existing options:', existingOptions.map(opt => opt.text));
      console.log('📋 New options:', options.map((opt: any) => opt.text));
      
      poll.options = options.map((newOpt: any, index: number) => {
        const existingOption = existingOptions[index];
        
        // If this is an existing option with the same text, preserve voting data
        if (existingOption && existingOption.text === newOpt.text) {
          console.log(`🔄 Preserving votes for option ${index}: "${newOpt.text}"`);
          return {
            text: newOpt.text,
            votes: existingOption.votes,
            voters: existingOption.voters
          };
        } else {
          console.log(`🔄 Resetting votes for option ${index}: "${newOpt.text}" (was: "${existingOption?.text || 'none'}")`);
          return {
            text: newOpt.text,
            votes: 0,
            voters: []
          };
        }
      });
    } else {
      console.log('⚠️ Options not provided or not an array, not updating');
    }
    
    // Update isActive if explicitly provided
    if (typeof isActive === 'boolean') {
      poll.isActive = isActive;
    }

    console.log('💾 ATTEMPTING TO SAVE...');
    try {
      await poll.save();
      console.log('✅ SAVE SUCCESSFUL!');
    } catch (saveError) {
      console.error('❌ SAVE FAILED:', saveError);
      throw saveError;
    }
    
    // Debug what was actually saved
    console.log('💾 SAVED POLL DATA:');
    console.log('Title:', poll.title);
    console.log('Start Date:', poll.startDate);
    console.log('End Date:', poll.endDate);
    console.log('Options:', JSON.stringify(poll.options, null, 2));
    console.log('===================');

    // Populate for response
    await poll.populate('createdBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Poll updated successfully',
      data: poll.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update poll',
      timestamp: new Date().toISOString()
    });
  }
};

// Delete poll (superadmin only)
export const deletePoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const poll = await Poll.findByIdAndDelete(id);
    
    if (!poll) {
      res.status(404).json({
        success: false,
        message: 'Poll not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Poll deleted successfully',
      data: null,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete poll',
      timestamp: new Date().toISOString()
    });
  }
};

// Get all polls (including inactive ones, superadmin only)
export const getAllPolls = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const polls = await Poll.find()
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'All polls retrieved successfully',
      data: polls,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get all polls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve polls',
      timestamp: new Date().toISOString()
    });
  }
};