# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Node.js/Express with TypeScript)

```bash
cd backend
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm run create-superadmin  # Create super admin account
```

### Frontend (Angular 17+ PWA)

```bash
cd frontend/pickleball-app
ng serve             # Start development server
ng build             # Build for production
ng test              # Run Jasmine/Karma tests
```

## Architecture Overview

This is a **pickleball court reservation system** with a multi-tier architecture:

- **Frontend**: Angular 17+ PWA with Angular Material UI components
- **Backend**: Express.js API server with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Shared**: TypeScript interfaces in `/shared/interfaces.ts`

### Key System Components

**Authentication Flow:**

- JWT-based authentication with role-based access (member/superadmin)
- Registration requires admin approval before account activation
- Coin-based payment system for court usage

**Court Reservation System:**

- Time slot validation (5 AM - 10 PM, hourly slots)
- Automatic conflict detection and coin deduction
- Weather integration for San Fernando, Pampanga via WeatherAPI.com

**Database Models** (located in `backend/src/models/`):

- User, CourtReservation, Payment, CoinTransaction, Suggestion, Poll, PageVisit

### API Structure

**Base URL**: `http://localhost:3000/api`

**Core Endpoints:**

- `/auth/*` - Authentication (register, login, profile)
- `/reservations/*` - Court booking management
- `/weather/*` - Weather data for court times

### Environment Setup

**Backend environment variables required:**

```env
MONGODB_URI=mongodb+srv://admin:Helenbot04117777!1@mydb.zxr9i5k.mongodb.net/PickleBallRT2@?retryWrites=true&w=majority&appName=MyDB
JWT_SECRET=your-jwt-secret
WEATHER_API_KEY=your-weatherapi-key
FRONTEND_URL=http://localhost:4200
```

### Development Workflow

1. **Start Backend**: `cd backend && npm run dev` (runs on port 3000)
2. **Start Frontend**: `cd frontend/pickleball-app && ng serve` (runs on port 4200)
3. **Test API Health**: `curl http://localhost:3000/api/health`

here### Git Workflow

**Frontend Changes (Angular PWA):**

```bash
# Navigate to frontend directory
cd frontend/pickleball-app

# Stage and commit frontend changes
git add .
git commit -m "✨ Your commit message with emoji and description"

# Push to origin (done by user)
git push origin main
```

**Backend Changes (Node.js/Express):**

```bash
# Navigate to backend directory
cd backend

# Stage and commit backend changes
git add .
git commit -m "🔧 Your commit message with emoji and description"

# Push to origin (done by user)
git push origin main
```

**Combined Changes:**

```bash
# From project root - commit both frontend and backend
git add .
git commit -m "🚀 Combined frontend and backend updates"

# Push to origin (done by user)
git push origin main
```

**Deployment Note:**

- Initial push and render deployment completed
- Claude handles `git add` and `git commit` for changes
- User handles `git push` to trigger deployment
- Frontend and backend can be committed separately or together

t### Code Organization

**Backend follows MVC pattern:**

- `controllers/` - Request handlers and business logic
- `models/` - MongoDB schemas with Mongoose
- `routes/` - Express route definitions
- `middleware/` - Authentication and validation
- `services/` - External API integrations (weather)

**Frontend uses Angular standalone components:**

- `components/` - UI components (dashboard, login, reservations)
- `services/` - HTTP clients and state management
- `guards/` - Route protection
- `models/` - TypeScript interfaces (mirrors shared interfaces)

### Testing

- Backend: No test framework configured yet
- Frontend: Jasmine/Karma setup in Angular CLI

### Important Notes

- **DATABASE**: Always use `PickleBallRT2@` database (with @ symbol) - this contains the production user data
- The system uses a coin-based economy where users spend virtual coins for court reservations
- Weather integration is specific to "Delapaz Norte, San Fernando Pampanga"
- Super admin credentials: username `superadmin`, password `Admin123` (no special characters)
- **Payment System**: Individual player payments with homeowner/non-homeowner rate differentiation:
  - Homeowners: ₱25/hour per person
  - Non-homeowners: ₱50/hour per person
  - Minimum court fee: ₱100/hour total
- **Timezone Configuration**: All date/time operations use **Philippine Standard Time (UTC+8)**:
  - Poll expiration dates are validated against Philippine timezone
  - Court reservation times follow Philippine local time
  - Weather data is for San Fernando, Pampanga (Philippine timezone)
  - Date comparisons in frontend services use `Asia/Manila` timezone
  - Backend stores dates in UTC but displays/validates in Philippine time
