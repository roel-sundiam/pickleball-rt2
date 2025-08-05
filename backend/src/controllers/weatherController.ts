import { Request, Response } from 'express';
import { WeatherService } from '../services/weatherService';
import { ApiResponse } from '../types/interfaces';

const weatherService = new WeatherService();

// Get current weather
export const getCurrentWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const weather = await weatherService.getCurrentWeather();

    if (!weather) {
      res.status(500).json({
        success: false,
        message: 'Unable to fetch current weather data',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Current weather retrieved successfully',
      data: weather,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get current weather error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve current weather',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get weather forecast for a specific date
export const getWeatherForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!date || isNaN(Date.parse(date))) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const forecast = await weatherService.getForecastWeather(date);

    res.status(200).json({
      success: true,
      message: 'Weather forecast retrieved successfully',
      data: forecast,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get weather forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weather forecast',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get weather for specific date and time slot
export const getWeatherForTimeSlot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const { timeSlot } = req.query;

    // Validate date format
    if (!date || isNaN(Date.parse(date))) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate time slot format
    if (!timeSlot || !/^\d{2}:\d{2}$/.test(timeSlot as string)) {
      res.status(400).json({
        success: false,
        message: 'Invalid time slot format. Use HH:MM',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const weather = await weatherService.getWeatherForTimeSlot(date, timeSlot as string);

    if (!weather) {
      // Return mock data if real weather data is not available
      const mockWeather = weatherService.getMockWeatherData(date, timeSlot as string);
      res.status(200).json({
        success: true,
        message: 'Weather data retrieved (using mock data)',
        data: mockWeather,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Weather data retrieved successfully',
      data: weather,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get weather for time slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weather data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get weather for date range
export const getWeatherForDateRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate date formats
    if (isNaN(Date.parse(startDate as string)) || isNaN(Date.parse(endDate as string))) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const weatherMap = await weatherService.getWeatherForDateRange(
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      success: true,
      message: 'Weather data for date range retrieved successfully',
      data: weatherMap,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get weather for date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weather data for date range',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};