// User related interfaces
export interface User {
  _id?: string;
  fullName: string;
  username: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  role: 'member' | 'superadmin';
  homeownerStatus: 'homeowner' | 'non-homeowner';
  isApproved: boolean;
  coinBalance: number;
  membershipFeesPaid: boolean;
  registrationDate: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// User selection interface for dropdowns/lists
export interface UserSelection {
  _id: string;
  fullName: string;
  username: string;
  email: string;
}

export interface UserRegistration {
  fullName: string;
  username: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  dateOfBirth?: Date;
  homeownerStatus: 'homeowner' | 'non-homeowner';
  agreeToTerms: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

// Court Reservation interfaces
export interface CourtReservation {
  _id?: string;
  userId: string;
  date: Date;
  startTime: string; // e.g., "05:00"
  endTime: string; // e.g., "08:00" 
  timeSlot?: string; // Legacy field, kept for backward compatibility
  players: string[]; // Array of player IDs or names
  playersData?: (UserSelection | string)[]; // Populated player data (UserSelection objects) or string IDs if not found
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  duration?: number; // Duration in hours
}

export interface ReservationRequest {
  date: string; // ISO date string
  startTime: string;
  endTime: string;
  timeSlot?: string; // Legacy field, kept for backward compatibility
  players: string[]; // Array of player IDs
  notes?: string;
}

// Payment interfaces
export interface Payment {
  _id?: string;
  userId: string;
  reservationId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'coins' | 'cash' | 'transfer';
  status: 'pending' | 'completed' | 'failed';
  receiptNumber: string;
  description: string;
}

export interface PaymentRequest {
  reservationId: string;
  amount: number;
  paymentMethod: 'coins' | 'cash' | 'transfer';
  description: string;
}

// PaymentLog interfaces for individual player payments
export interface PaymentLog {
  _id?: string;
  userId: string;
  reservationId: string;
  reservationDate: Date;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  notes?: string;
  homeownerStatus: 'homeowner' | 'non-homeowner';
  ratePerHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentLogRequest {
  reservationId: string;
  amount: number;
  notes?: string;
}

export interface PlayerPaymentCalculation {
  playerId: string;
  playerName: string;
  username: string;
  homeownerStatus: 'homeowner' | 'non-homeowner';
  ratePerHour: number;
  totalAmount: number;
}

export interface PaymentCalculationSummary {
  duration: number;
  homeownerCount: number;
  nonHomeownerCount: number;
  homeownerRatePerHour: number;
  nonHomeownerRatePerHour: number;
  totalPerHour: number;
  grandTotal: number;
}

export interface PaymentCalculationResponse {
  playerPayments: PlayerPaymentCalculation[];
  summary: PaymentCalculationSummary;
}

// Coin Transaction interfaces
export interface CoinTransaction {
  _id?: string;
  userId: string;
  type: 'earned' | 'spent' | 'requested' | 'granted';
  amount: number;
  description: string;
  referenceId?: string; // Could be reservation ID, page visit ID, etc.
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CoinRequest {
  amount: number;
  reason: string;
}

// Weather interfaces
export interface WeatherData {
  date: string;
  timeSlot: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
}

// Suggestion/Complaint interfaces
export interface Suggestion {
  _id?: string;
  userId: string;
  title: string;
  description: string;
  category: 'suggestion' | 'complaint' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
  createdAt: Date;
  attachments?: string[];
}

export interface SuggestionRequest {
  title: string;
  description: string;
  category: 'suggestion' | 'complaint' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high';
  attachments?: File[];
}

// Poll interfaces
export interface Poll {
  _id?: string;
  title: string;
  description: string;
  options: PollOption[];
  createdBy: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  votedUsers: string[]; // Array of user IDs who have voted
  createdAt: Date;
}

export interface PollOption {
  _id?: string;
  text: string;
  votes: number;
  voters: string[]; // Array of user IDs who voted for this option
}

export interface PollVote {
  pollId: string;
  optionId: string;
}

// Site Analytics interfaces
export interface PageVisit {
  _id?: string;
  userId: string;
  pageName: string;
  url: string;
  timestamp: Date;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  coinsConsumed: number;
}

export interface AnalyticsReport {
  totalVisits: number;
  uniqueUsers: number;
  topPages: { page: string; visits: number }[];
  userActivity: { username: string; visits: number; coinsSpent: number }[];
  dailyVisits: { date: string; visits: number }[];
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Time slot constants
export const TIME_SLOTS = [
  '05:00', '06:00', '07:00', '08:00', '09:00', '10:00',
  '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
] as const;

export type TimeSlot = typeof TIME_SLOTS[number];

// Configuration constants
export const COIN_COSTS = {
  // Legacy page visit cost (for backward compatibility)
  PAGE_VISIT: 1,
  
  // Tiered page visit costs
  PAGE_VISIT_FREE: 0,
  PAGE_VISIT_LOW: 1,
  PAGE_VISIT_MEDIUM: 2,
  PAGE_VISIT_HIGH: 3,
  
  // Other feature costs
  COURT_RESERVATION: 10,
  PREMIUM_FEATURE: 5
} as const;

export const COURT_FEES = {
  HOMEOWNER_RATE: 25, // pesos per hour per homeowner
  NON_HOMEOWNER_RATE: 50, // pesos per hour per non-homeowner
  MINIMUM_TOTAL: 100 // minimum total court fee per hour
} as const;

export const FREE_COINS_FOR_NEW_USER = 100;