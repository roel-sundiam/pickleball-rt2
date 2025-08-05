"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FREE_COINS_FOR_NEW_USER = exports.COURT_FEES = exports.COIN_COSTS = exports.TIME_SLOTS = void 0;
// Time slot constants
exports.TIME_SLOTS = [
    '05:00', '06:00', '07:00', '08:00', '09:00', '10:00',
    '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];
// Configuration constants
exports.COIN_COSTS = {
    PAGE_VISIT: 1,
    COURT_RESERVATION: 10,
    PREMIUM_FEATURE: 5
};
exports.COURT_FEES = {
    HOMEOWNER_RATE: 25, // pesos per hour per homeowner
    NON_HOMEOWNER_RATE: 50, // pesos per hour per non-homeowner
    MINIMUM_TOTAL: 100 // minimum total court fee per hour
};
exports.FREE_COINS_FOR_NEW_USER = 100;
//# sourceMappingURL=interfaces.js.map