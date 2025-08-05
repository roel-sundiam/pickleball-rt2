# Next Task: Poll Feature Implementation

## Overview
Complete the poll feature for the pickleball court reservation system. Members can vote on polls, and when a new poll is created, a message should be visible.

## Current Status
✅ **Foundation Complete:**
- Poll model exists (`backend/src/models/Poll.ts`)
- Shared interfaces defined (`shared/interfaces.ts`)

❌ **Missing Implementation:**
- Backend API (controller & routes)
- Frontend components and service
- UI integration

## Implementation Plan

### Backend Tasks

1. **Create Poll Controller** (`backend/src/controllers/pollController.ts`)
   ```typescript
   // Required methods:
   - createPoll (admin only)
   - getAllActivePolls (members can view)
   - voteOnPoll (members only, no duplicate votes)
   - getPollResults (view results)
   - updatePoll (admin only)
   - deletePoll (admin only)
   ```

2. **Create Poll Routes** (`backend/src/routes/pollRoutes.ts`)
   ```typescript
   // Route structure:
   GET    /api/polls           - Get all active polls
   POST   /api/polls           - Create new poll (admin)
   POST   /api/polls/:id/vote  - Vote on poll (members)
   GET    /api/polls/:id       - Get poll results
   PUT    /api/polls/:id       - Update poll (admin)
   DELETE /api/polls/:id       - Delete poll (admin)
   ```

3. **Mount Routes** in `backend/src/server.ts`
   ```typescript
   app.use('/api/polls', pollRoutes);
   ```

### Frontend Tasks

4. **Create Poll Service** (`frontend/pickleball-app/src/app/services/poll.service.ts`)
   - HTTP client methods for all poll operations
   - Error handling and response typing

5. **Create Poll Components:**
   - `poll-list.component.ts` - Display active polls with voting interface
   - `poll-form.component.ts` - Create new poll form (admin only)
   - `poll-results.component.ts` - Display poll results and statistics
   - Individual poll card component for reusable display

6. **Add Poll Routes** to `frontend/pickleball-app/src/app/app.routes.ts`
   ```typescript
   // Add routes with PageVisitGuard:
   { path: 'polls', component: PollListComponent, canActivate: [authGuard, PageVisitGuard] }
   { path: 'polls/create', component: PollFormComponent, canActivate: [authGuard, superadminGuard, PageVisitGuard] }
   ```

7. **Update Frontend Interfaces** (`frontend/pickleball-app/src/app/models/interfaces.ts`)
   - Mirror the shared interfaces for type safety

8. **Dashboard Integration**
   - Add "Polls" navigation item to dashboard
   - Show notification when new poll is created
   - Display active poll count or recent polls

9. **Logo & Design Integration**
   - Copy PickleLogo.png to frontend assets folder
   - Update app branding with "Richtown2 Pickleball Club" logo
   - Apply color scheme: green (#4CAF50), blue (#2196F3), orange gradient backgrounds
   - Use logo in header/navigation components

## Technical Requirements

### Authentication & Authorization
- **Members can vote:** Use `authenticate` + `requireApproval` middleware
- **Admins can create:** Add `requireSuperAdmin` for creation endpoints
- **No duplicate votes:** Backend validation using existing poll model logic

### UI/UX Requirements
- **New Poll Message:** Toast notification or banner when poll is created
- **Responsive Design:** Use Angular Material components for consistency
- **Loading States:** Show loading spinners during API calls
- **Error Handling:** User-friendly error messages
- **Brand Integration:** Use Richtown2 Pickleball Club logo and color scheme throughout
- **Visual Consistency:** Apply green/blue/orange theme to buttons, cards, and accents

### Database Considerations
- Poll model already handles vote tracking and duplicate prevention
- Consider adding indexes for performance if needed
- Validate poll end dates are in the future

## Testing Checklist
- [ ] Create poll as admin
- [ ] Vote as regular member
- [ ] Prevent duplicate voting
- [ ] View poll results
- [ ] Non-members cannot vote
- [ ] Poll expiration handling
- [ ] New poll notification display

## Follow-up Enhancements (Future)
- Email notifications for new polls
- Poll categories or tags
- Anonymous voting option
- Poll templates
- Bulk poll operations
- Poll analytics and reporting

---

**Priority:** High - Core feature for community engagement
**Estimated Time:** 4-6 hours for full implementation
**Dependencies:** Existing authentication system, Angular Material UI