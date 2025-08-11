# Page Visit Coin System Documentation

## Overview

This document outlines the proposed tiered coin deduction system for page visits in the Pickleball Court Reservation System. The system is designed to balance user experience with resource management by implementing variable coin costs based on page value and functionality.

## Current System vs Proposed System

| Aspect | Current System | Proposed System |
|--------|---------------|-----------------|
| **Coin Cost** | Flat 1 coin per page | Tiered: 0-3 coins based on page value |
| **Page Categories** | All pages equal | 5 tiers: Free, Low, Medium, High, Admin |
| **User Experience** | Simple but potentially costly | More nuanced and user-friendly |
| **Admin Access** | 0 coins (exempt) | 0 coins (maintained) |

## Detailed Page Breakdown

### Tier 1: Free Access (0 Coins)
Essential pages that should remain accessible without coin cost.

| Page | Route | Rationale |
|------|-------|-----------|
| **Login** | `/login` | Authentication requirement - must be free |
| **Register** | `/register` | User onboarding - barrier-free entry |
| **Dashboard** | `/dashboard` | Main hub - users' home base |
| **Gallery (View)** | `/gallery` | Public content - community engagement |
| **Court Rules** | `/court-rules` | Important information - safety and compliance |

### Tier 2: Low Value (1 Coin)
Basic functionality and information viewing.

| Page | Route | Rationale |
|------|-------|-----------|
| **Profile** | `/profile` | Personal information management |
| **My Reservations** | `/reservations` | View existing bookings |
| **Court Schedule** | `/schedule` | View court availability |
| **Club Members** | `/members` | Directory viewing |
| **Payment History** | `/payment/history` | Transaction record access |
| **Community Polls (View)** | `/polls` | Browse community polls |
| **Poll Results** | `/polls/:id/results` | View voting outcomes |

### Tier 3: Medium Value (2 Coins)
Enhanced features and community interaction.

| Page | Route | Rationale |
|------|-------|-----------|
| **Suggestions** | `/suggestions` | Community feedback system |
| **New Suggestion** | `/suggestions/form` | Content creation |
| **Premium Features** | `/premium` | Special content access |
| **Weekend Payment** | `/payment/weekend` | Specialized payment processing |

### Tier 4: High Value (3 Coins)
Core business functions and high-impact actions.

| Page | Route | Rationale |
|------|-------|-----------|
| **Book Reservation** | `/book-reservation` | Primary revenue-generating action |
| **Payment Form** | `/payment` | Financial transaction processing |
| **Upload Photo** | `/gallery/upload` | Content creation with storage costs |

### Tier 5: Administrative (0 Coins)
Superadmin-only pages with no coin cost.

| Page | Route | Access Level | Rationale |
|------|-------|--------------|-----------|
| **Admin Dashboard** | `/admin` | Superadmin | Administrative functions |
| **Page Visit History** | `/analytics/page-visits` | Superadmin | System analytics |
| **Coin Management** | `/coins` | Superadmin | System management |
| **Gallery Admin** | `/gallery/admin` | Superadmin | Content moderation |
| **Create Poll** | `/polls/create` | Superadmin | Content creation (admin) |
| **Edit Poll** | `/polls/:id/edit` | Superadmin | Content management |
| **Court Receipts Report** | `/reports/court-receipts` | Superadmin | Financial reporting |

## Implementation Guidelines

### Technical Configuration

#### 1. Update COIN_COSTS Constants
```typescript
export const COIN_COSTS = {
  // Page visit tiers
  PAGE_VISIT_FREE: 0,
  PAGE_VISIT_LOW: 1,
  PAGE_VISIT_MEDIUM: 2,
  PAGE_VISIT_HIGH: 3,
  
  // Existing costs
  COURT_RESERVATION: 10,
  PREMIUM_FEATURE: 5
} as const;
```

#### 2. Route Configuration Enhancement
```typescript
// Example route with coin cost
{
  path: 'book-reservation',
  component: BookReservationComponent,
  canActivate: [authGuard, PageVisitGuard],
  data: { 
    pageName: 'Book Reservation',
    coinCost: COIN_COSTS.PAGE_VISIT_HIGH // 3 coins
  }
}
```

#### 3. Page Visit Guard Updates
- Read `coinCost` from route data
- Fall back to `PAGE_VISIT_LOW` (1 coin) if not specified
- Maintain existing superadmin exemption logic

### Migration Strategy

1. **Phase 1**: Update configuration and route data
2. **Phase 2**: Deploy with backward compatibility
3. **Phase 3**: Monitor usage patterns and adjust if needed

## User Impact Analysis

### Positive Impacts
- **Reduced barrier to entry**: Free access to essential pages
- **Logical pricing**: Higher costs for high-value actions
- **Better coin conservation**: Users can navigate freely while saving coins for important actions

### Considerations
- **User education**: Need to communicate the new pricing structure
- **Monitoring required**: Track user behavior changes
- **Adjustment flexibility**: Be prepared to fine-tune costs based on usage data

## Coin Economy Balance

### Starting Coin Allocation
- **New users**: 100 free coins (unchanged)
- **High-value pages**: 3 coins max ensures users can perform 33+ booking attempts

### Economic Considerations
- **Free tier**: Encourages exploration and engagement
- **Progressive pricing**: Aligns cost with system resource usage
- **Admin exemption**: Maintains operational efficiency

## Usage Scenarios

### Typical User Journey (Cost Analysis)
1. Login → Dashboard → Court Schedule → Book Reservation
2. **Cost**: 0 + 0 + 1 + 3 = **4 coins total**
3. **Previous cost**: 1 + 1 + 1 + 1 = **4 coins total**

### Heavy User (Daily Usage)
1. Dashboard (daily) → My Reservations → Payment History → Book Reservation
2. **Weekly cost**: (0 × 7) + 1 + 1 + 3 = **5 coins**
3. **Previous weekly cost**: (1 × 7) + 1 + 1 + 1 = **10 coins**

## Future Considerations

### Monitoring Metrics
- **Page visit frequency** by tier
- **User coin balance trends**
- **Abandonment rates** at different price points
- **Overall user engagement** levels

### Potential Adjustments
- **Dynamic pricing**: Adjust costs based on server load
- **User-specific rates**: Loyalty discounts for active users
- **Promotional pricing**: Temporary cost reductions for specific features

### Feature Enhancements
- **Coin purchase options**: Allow users to buy additional coins
- **Earning mechanisms**: Reward users with coins for community participation
- **Subscription model**: Monthly access passes for heavy users

## Conclusion

This tiered coin system provides a more sophisticated approach to resource management while improving user experience. The system maintains the core functionality of tracking and controlling page visits while offering a more nuanced pricing structure that aligns costs with value delivered.

---

**Implementation Status**: Proposed  
**Last Updated**: August 11, 2025  
**Next Review**: After 30 days of implementation data collection