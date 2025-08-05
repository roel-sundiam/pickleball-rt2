import axios from 'axios';
import { WeatherData } from '../types/interfaces';

export class WeatherService {
  private apiKey: string = '24cdbd56de73639e95ef35457c21e165';
  private baseUrl: string = 'https://api.openweathermap.org/data/2.5';
  private lat: number = 15.087;
  private lon: number = 120.6285;

  constructor() {
    // Using provided OpenWeatherMap API key and coordinates for San Fernando, Pampanga
  }

  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const data = response.data;
      const currentTime = new Date();
      const timeSlot = `${currentTime.getHours().toString().padStart(2, '0')}:00`;

      return {
        date: currentTime.toISOString().split('T')[0],
        timeSlot,
        temperature: Math.round(data.main.temp),
        condition: this.getWeatherCondition(data.weather[0].main, data.weather[0].description),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        icon: data.weather[0].icon,
        description: data.weather[0].description,
        iconCode: data.weather[0].icon
      };

    } catch (error) {
      console.error('Error fetching current weather:', error);
      return null;
    }
  }

  async getForecastWeather(date: string): Promise<WeatherData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const forecastList = response.data.list;
      const weatherForecast: WeatherData[] = [];
      
      // Filter forecast data for the requested date
      const targetDate = new Date(date);
      
      for (const forecast of forecastList) {
        const forecastDate = new Date(forecast.dt * 1000);
        
        // Check if this forecast is for the target date
        if (forecastDate.toDateString() === targetDate.toDateString()) {
          const hour = forecastDate.getHours();
          
          // Only include hours from 5 AM to 10 PM
          if (hour >= 5 && hour <= 22) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;

            weatherForecast.push({
              date,
              timeSlot,
              temperature: Math.round(forecast.main.temp),
              condition: this.getWeatherCondition(forecast.weather[0].main, forecast.weather[0].description),
              humidity: forecast.main.humidity,
              windSpeed: Math.round(forecast.wind.speed * 3.6), // Convert m/s to km/h
              icon: forecast.weather[0].icon,
              description: forecast.weather[0].description,
              iconCode: forecast.weather[0].icon
            });
          }
        }
      }

      // If no forecast data found for the date, return mock data for each hour
      if (weatherForecast.length === 0) {
        for (let hour = 5; hour <= 22; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          weatherForecast.push(this.getMockWeatherData(date, timeSlot));
        }
      }

      return weatherForecast;

    } catch (error) {
      console.error('Error fetching forecast weather:', error);
      // Return mock data for each hour as fallback
      const mockForecast: WeatherData[] = [];
      for (let hour = 5; hour <= 22; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        mockForecast.push(this.getMockWeatherData(date, timeSlot));
      }
      return mockForecast;
    }
  }

  async getWeatherForTimeSlot(date: string, timeSlot: string): Promise<WeatherData | null> {
    try {
      const forecastData = await this.getForecastWeather(date);
      return forecastData.find(weather => weather.timeSlot === timeSlot) || null;
    } catch (error) {
      console.error('Error fetching weather for time slot:', error);
      return null;
    }
  }

  // Get weather for multiple dates (useful for weekly view)
  async getWeatherForDateRange(startDate: string, endDate: string): Promise<{ [date: string]: WeatherData[] }> {
    try {
      const weatherMap: { [date: string]: WeatherData[] } = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Limit to 7 days to avoid exceeding API limits
      const maxDays = 7;
      let dayCount = 0;

      for (let date = new Date(start); date <= end && dayCount < maxDays; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        weatherMap[dateString] = await this.getForecastWeather(dateString);
        dayCount++;
      }

      return weatherMap;

    } catch (error) {
      console.error('Error fetching weather for date range:', error);
      return {};
    }
  }

  // Helper method to get weather condition display name
  private getWeatherCondition(main: string, description: string): string {
    const conditionMap: { [key: string]: string } = {
      'Clear': 'Sunny',
      'Clouds': 'Cloudy',
      'Rain': 'Rainy',
      'Drizzle': 'Light rain',
      'Thunderstorm': 'Thunderstorm',
      'Snow': 'Snow',
      'Mist': 'Misty',
      'Fog': 'Foggy',
      'Haze': 'Hazy'
    };

    return conditionMap[main] || main;
  }

  // Mock weather data for testing when API is not available
  getMockWeatherData(date: string, timeSlot: string): WeatherData {
    const mockConditions = [
      { condition: 'Sunny', icon: '01d', main: 'Clear' },
      { condition: 'Partly cloudy', icon: '02d', main: 'Clouds' },
      { condition: 'Cloudy', icon: '04d', main: 'Clouds' },
      { condition: 'Light rain', icon: '10d', main: 'Rain' },
      { condition: 'Clear', icon: '01d', main: 'Clear' }
    ];
    const randomWeather = mockConditions[Math.floor(Math.random() * mockConditions.length)];
    const baseTemp = 28; // Base temperature for Philippines
    const tempVariation = Math.floor(Math.random() * 8) - 4; // ±4 degrees

    return {
      date,
      timeSlot,
      temperature: baseTemp + tempVariation,
      condition: randomWeather.condition,
      humidity: Math.floor(Math.random() * 30) + 60, // 60-90%
      windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 kph
      icon: randomWeather.icon,
      description: randomWeather.condition,
      iconCode: randomWeather.icon
    };
  }
}