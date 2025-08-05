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
export interface CourtReservation {
    _id?: string;
    userId: string;
    date: Date;
    startTime: string;
    endTime: string;
    timeSlot?: string;
    players: string[];
    playersData?: (UserSelection | string)[];
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    paymentStatus: 'pending' | 'paid';
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
    duration?: number;
}
export interface ReservationRequest {
    date: string;
    startTime: string;
    endTime: string;
    timeSlot?: string;
    players: string[];
    notes?: string;
}
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
export interface CoinTransaction {
    _id?: string;
    userId: string;
    type: 'earned' | 'spent' | 'requested' | 'granted';
    amount: number;
    description: string;
    referenceId?: string;
    createdAt: Date;
    status: 'pending' | 'approved' | 'rejected';
}
export interface CoinRequest {
    amount: number;
    reason: string;
}
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
export interface Poll {
    _id?: string;
    title: string;
    description: string;
    options: PollOption[];
    createdBy: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    votedUsers: string[];
    createdAt: Date;
}
export interface PollOption {
    _id?: string;
    text: string;
    votes: number;
    voters: string[];
}
export interface PollVote {
    pollId: string;
    optionId: string;
}
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
    topPages: {
        page: string;
        visits: number;
    }[];
    userActivity: {
        username: string;
        visits: number;
        coinsSpent: number;
    }[];
    dailyVisits: {
        date: string;
        visits: number;
    }[];
}
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
export declare const TIME_SLOTS: readonly ["05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
export type TimeSlot = typeof TIME_SLOTS[number];
export declare const COIN_COSTS: {
    readonly PAGE_VISIT: 1;
    readonly COURT_RESERVATION: 10;
    readonly PREMIUM_FEATURE: 5;
};
export declare const COURT_FEES: {
    readonly HOMEOWNER_RATE: 25;
    readonly NON_HOMEOWNER_RATE: 50;
    readonly MINIMUM_TOTAL: 100;
};
export declare const FREE_COINS_FOR_NEW_USER = 100;
