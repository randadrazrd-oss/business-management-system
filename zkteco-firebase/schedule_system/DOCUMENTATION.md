# Sunrise Nursery - Schedule System Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Directory Structure](#directory-structure)
6. [Setup & Installation](#setup--installation)
7. [Configuration](#configuration)
8. [Authentication & Authorization](#authentication--authorization)
9. [Database Schema](#database-schema)
10. [API Services](#api-services)
11. [Components](#components)
12. [Internationalization](#internationalization)
13. [Security](#security)
14. [Deployment](#deployment)

---

## Project Overview

**Sunrise Nursery Schedule System** is a comprehensive clinical scheduling and management platform designed for nursery/specialist therapy centers. The system enables administrators, secretaries, and specialists to manage appointments, track patient progress, and generate clinical reports.

### Key Capabilities
- Real-time appointment scheduling with conflict detection
- Role-based access control (Admin, Secretary, Specialist)
- Multi-language support (English/Arabic) with RTL support
- Clinical session tracking with notes and progress monitoring
- Treatment plan management with goal setting
- File attachment system for patient documents
- Analytics and reporting (Weekly, Monthly, Sessions Log)
- Live dashboard with real-time monitoring

---

## Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **Vite 5.4.0** - Build tool and dev server
- **React Router DOM 7.14.1** - Client-side routing
- **TailwindCSS 3.4.19** - Utility-first CSS framework
- **Lucide React 1.8.0** - Icon library
- **Recharts 3.8.1** - Data visualization charts
- **React Hot Toast 2.6.0** - Toast notifications
- **SWR 2.4.1** - Data fetching and caching
- **date-fns 4.1.0** - Date manipulation utilities

### Backend / Database
- **Firebase 12.12.0** - Backend-as-a-Service
  - **Firestore** - NoSQL database
  - **Firebase Auth** - Authentication
  - **Firebase Storage** - File storage

### Development Tools
- **ESLint 9.8.0** - Code linting
- **PostCSS 8.5.10** - CSS processing
- **Autoprefixer 10.5.0** - CSS vendor prefixing

---

## Architecture

### Application Structure
The application follows a modular React architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     React App                           │
├─────────────────────────────────────────────────────────┤
│  Context Providers                                      │
│  ├── AuthContext (Authentication state)                 │
│  └── LanguageContext (i18n state)                       │
├─────────────────────────────────────────────────────────┤
│  Routing (React Router)                                 │
│  ├── Protected Routes (Role-based)                      │
│  └── Public Routes (Login)                              │
├─────────────────────────────────────────────────────────┤
│  Layout Components                                       │
│  ├── Sidebar (Navigation)                               │
│  └── Layout (Main wrapper)                              │
├─────────────────────────────────────────────────────────┤
│  Page Components                                         │
│  ├── Dashboard (Admin/Secretary)                        │
│  ├── Specialists Management                              │
│  ├── Children/Patient Management                        │
│  ├── Schedule Grid                                       │
│  ├── My Schedule (Specialist view)                       │
│  ├── Reports (Weekly/Monthly/Log)                        │
│  └── User Management (Admin only)                        │
├─────────────────────────────────────────────────────────┤
│  Custom Hooks                                            │
│  ├── useAllSchedules (Schedule fetching)                │
│  ├── useBooking (Booking operations)                    │
│  ├── useSchedule (Single schedule)                       │
│  └── useSessions (Session operations)                    │
├─────────────────────────────────────────────────────────┤
│  Services (API Layer)                                   │
│  ├── Firebase Config                                     │
│  ├── bookingService.js                                   │
│  ├── sessionService.js                                   │
│  ├── childService.js                                     │
│  ├── specialistService.js                               │
│  ├── userService.js                                      │
│  └── treatmentPlanService.js                             │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. **User Action** → Component
2. **Component** → Custom Hook / Service
3. **Service** → Firebase (Firestore/Auth/Storage)
4. **Firebase Response** → Service
5. **Service** → Component State Update
6. **Component Re-render** → UI Update

---

## Features

### By Role

#### Admin
- Full system access
- User management (create/manage users)
- Specialist management (add/edit/delete specialists)
- Patient/child management
- Schedule viewing and management
- All reports access
- System configuration

#### Secretary
- Specialist management (add/edit)
- Patient/child management
- Schedule viewing and booking
- All reports access
- Cannot manage users

#### Specialist
- View personal schedule only
- Complete assigned sessions
- Add clinical notes
- View patient profiles
- Cannot modify schedule or manage users

### Core Features

#### 1. Appointment Scheduling
- Real-time slot availability
- Conflict detection using Firestore transactions
- Support for moving/cancelling appointments
- Auto-completion of past sessions
- 45-minute session slots (configurable)

#### 2. Patient Management
- Patient profiles with diagnosis
- Treatment plan management
- Clinical goal setting
- Progress tracking (improving/stable/needs attention)
- File attachments (reports, documents)
- Session history log

#### 3. Specialist Management
- Specialist profiles with specialization
- Working hours configuration
- Working days configuration
- Per-day custom slot generation
- Availability tracking

#### 4. Clinical Session Management
- Session status tracking (scheduled/booked/completed/cancelled)
- Clinical notes per session
- Automatic session completion
- Session count tracking per patient

#### 5. Reporting & Analytics
- **Weekly Report**: Activity overview by day
- **Monthly Report**: Macro-level clinical performance
- **Sessions Log**: Detailed historical record
- Real-time dashboard with:
  - Specialist workload charts
  - Hourly session distribution
  - Completion rates
  - Top performer metrics

#### 6. Internationalization
- English and Arabic support
- RTL (Right-to-Left) layout for Arabic
- Language toggle in header
- Persistent language preference

---

## Directory Structure

```
scheduleSystem/
├── public/                      # Static assets
│   └── logo-transparent.png
├── src/
│   ├── assets/                  # React assets
│   │   └── react.svg
│   ├── components/              # Reusable components
│   │   ├── BookingModal.jsx    # Appointment booking modal
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   ├── ProtectedRoute.jsx  # Route protection wrapper
│   │   └── Sidebar.jsx         # Navigation sidebar
│   ├── config/                  # Configuration files
│   │   └── firebase.js         # Firebase initialization
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.jsx    # Authentication state
│   │   └── LanguageContext.jsx # i18n state
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAllSchedules.js  # Fetch all schedules
│   │   ├── useBooking.js       # Booking operations
│   │   ├── useSchedule.js      # Single schedule operations
│   │   └── useSessions.js      # Session operations
│   ├── locales/                # Translation files
│   │   ├── en.json            # English translations
│   │   └── ar.json            # Arabic translations
│   ├── pages/                  # Page components
│   │   ├── admin/
│   │   │   └── UserManagement.jsx
│   │   ├── reports/
│   │   │   ├── MonthlyReport.jsx
│   │   │   ├── SessionsLog.jsx
│   │   │   └── WeeklyReport.jsx
│   │   ├── ChildProfile.jsx   # Patient detail view
│   │   ├── Children.jsx       # Patient list
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── Login.jsx          # Authentication page
│   │   ├── MySchedule.jsx    # Specialist schedule view
│   │   ├── Schedule.jsx       # Schedule management
│   │   ├── ScheduleGrid.jsx   # Grid schedule view
│   │   ├── Settings.jsx       # Settings page
│   │   ├── Specialists.jsx    # Specialist management
│   │   └── Unauthorized.jsx   # Access denied page
│   ├── services/              # API/Firebase services
│   │   ├── bookingService.js  # Booking transactions
│   │   ├── childService.js    # Patient CRUD
│   │   ├── mockData.js        # Mock data for development
│   │   ├── patientService.js  # Patient operations
│   │   ├── scheduleService.js # Schedule operations
│   │   ├── secretaryService.js
│   │   ├── sessionService.js  # Session CRUD
│   │   ├── specialistService.js # Specialist CRUD
│   │   ├── treatmentPlanService.js # Treatment plans
│   │   └── userService.js     # User management
│   ├── utils/                 # Utility functions
│   │   ├── scheduleLogic.js   # Slot generation logic
│   │   └── seedFirestore.js  # Database seeding
│   ├── App.css               # App-specific styles
│   ├── App.jsx               # Main app component with routing
│   ├── index.css             # Global styles
│   └── main.jsx              # Application entry point
├── dist/                      # Build output (generated)
├── node_modules/             # Dependencies (generated)
├── .gitignore                # Git ignore rules
├── eslint.config.js          # ESLint configuration
├── firestore.rules           # Firestore security rules
├── index.html                # HTML entry point
├── package.json              # Project dependencies
├── package-lock.json         # Dependency lock file
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # TailwindCSS configuration
├── vite.config.js            # Vite configuration
└── README.md                 # Project readme
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore, Auth, and Storage enabled

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd scheduleSystem
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore, Authentication (Email/Password), and Storage
   - Copy your Firebase config
   - Update `src/config/firebase.js` with your credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

4. **Deploy Firestore Security Rules**
   - Go to Firebase Console → Firestore → Rules
   - Copy the contents of `firestore.rules`
   - Publish the rules

5. **Seed Initial Admin User**
   - Navigate to `http://localhost:5173/login?init=true`
   - Enter email and password (min 6 characters)
   - Click "Seed Admin Account"
   - This creates the first admin user

6. **Run Development Server**
```bash
npm run dev
```

7. **Build for Production**
```bash
npm run build
```

8. **Preview Production Build**
```bash
npm run preview
```

---

## Configuration

### Firebase Configuration (`src/config/firebase.js`)

The Firebase configuration file initializes:
- **Firestore** - Main database
- **Auth** - Authentication (primary instance)
- **Secondary Auth** - Used for creating user accounts without signing out admin
- **Storage** - File storage for attachments

**Note**: The file includes a `USE_MOCK` flag that enables mock mode when API key is missing.

### TailwindCSS Configuration (`tailwind.config.js`)

Custom theme extensions:
- **Colors**: Primary (orange), Secondary (amber), Navy (slate), Success, Danger
- **Fonts**: Inter, Tajawal (for Arabic), Outfit (display)
- **Shadows**: Premium shadows for elevated UI elements

### Vite Configuration (`vite.config.js`)

Standard React plugin configuration with Vite for fast HMR.

### ESLint Configuration (`eslint.config.js`)

Configured with:
- React plugin
- React Hooks plugin
- React Refresh plugin

---

## Authentication & Authorization

### Authentication Flow

1. **Login** (`src/pages/Login.jsx`)
   - User enters email/password
   - Calls `login()` from AuthContext
   - Firebase Auth validates credentials
   - User profile fetched from Firestore
   - Account active status checked
   - Session persisted with `browserLocalPersistence`

2. **Auth Context** (`src/contexts/AuthContext.jsx`)
   - Manages authentication state
   - Provides:
     - `currentUser` - Firebase auth user
     - `userProfile` - Firestore user document
     - `userRole` - Role (admin/secretary/specialist)
     - `isAdmin`, `isSecretary`, `isSpecialist` - Convenience booleans
     - `login()`, `logout()` - Auth methods

3. **Protected Routes** (`src/components/ProtectedRoute.jsx`)
   - Wraps routes requiring authentication
   - Redirects to `/login` if not authenticated
   - Supports role-based access with `allowedRoles` prop
   - Redirects to `/unauthorized` if role doesn't match

### Role-Based Access Control

| Route | Admin | Secretary | Specialist |
|-------|-------|-----------|------------|
| /dashboard | ✅ | ✅ | ❌ |
| /specialists | ✅ | ✅ | ❌ |
| /children | ✅ | ✅ | ❌ |
| /schedule | ✅ | ✅ | ❌ |
| /my-schedule | ❌ | ❌ | ✅ |
| /reports/* | ✅ | ✅ | ❌ |
| /admin/users | ✅ | ❌ | ❌ |

### User Schema (Firestore: `users` collection)

```javascript
{
  uid: string,           // Firebase Auth UID
  email: string,
  displayName: string,
  role: 'admin' | 'secretary' | 'specialist',
  specialistId: string, // For specialists only
  active: boolean,       // Account status
  createdAt: string (ISO),
  updatedAt: string (ISO)
}
```

---

## Database Schema

### Collections Overview

#### 1. `users`
User accounts and role assignments.

**Fields:**
- `uid` (string) - Firebase Auth UID
- `email` (string)
- `displayName` (string)
- `role` (string) - 'admin', 'secretary', 'specialist'
- `specialistId` (string, optional) - Link to specialist document
- `active` (boolean) - Account active status
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### 2. `specialists`
Specialist profiles and availability.

**Fields:**
- `name` (string)
- `specialization` (string)
- `startHour` (string) - e.g., "09:00"
- `endHour` (string) - e.g., "17:00"
- `workingDays` (array) - ["Sunday", "Monday", ...]
- `availability` (object) - Additional availability config
- `createdAt` (timestamp)

**Subcollection: `days/{date}`**
- `slots` (object) - Time slot statuses
  - `{ "09:00": { status: "booked", childId: "...", childName: "...", sessionId: "..." } }`

#### 3. `children` (Patients)
Patient profiles and clinical data.

**Fields:**
- `name` (string)
- `diagnosis` (string)
- `age` (number)
- `totalSessions` (number) - Target session count
- `completedSessions` (number)
- `improvementStatus` (string) - 'improving', 'stable', 'needs_attention'
- `notes` (string)
- `attachments` (array) - File metadata
  - `{ name, url, path, sizeBytes, uploadedAt }`
- `lastNote` (string) - Most recent clinical note
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Subcollection: `locks/{date_time}`**
- Prevents double-booking for same child
- `sessionId` (string)
- `specialistId` (string)
- `createdAt` (timestamp)

**Subcollection: `treatmentPlans`**
- `goals` (array) - Clinical goals
  - `{ description, status, createdAt }`
- `createdAt` (timestamp)

#### 4. `sessions`
Individual session records.

**Fields:**
- `childId` (string)
- `childName` (string)
- `specialistId` (string)
- `specialistName` (string)
- `date` (string) - "YYYY-MM-DD"
- `time` (string) - "HH:mm"
- `startTime` (timestamp) - Firebase Timestamp
- `endTime` (timestamp) - Firebase Timestamp
- `status` (string) - 'scheduled', 'booked', 'completed', 'cancelled'
- `diagnosis` (string)
- `planId` (string, optional)
- `planFocus` (string, optional)
- `notes` (string) - General notes
- `clinicalNotes` (string) - Specialist clinical notes
- `completedAt` (timestamp, optional)
- `cancelledAt` (timestamp, optional)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### 5. `secretaries`
Secretary profiles (if needed beyond users collection).

#### 6. `admins`
Admin profiles (if needed beyond users collection).

---

## API Services

### Service Layer Architecture

All services are located in `src/services/` and provide a clean API layer between components and Firebase.

### Key Services

#### 1. `bookingService.js`
**Purpose**: Atomic booking transactions with conflict detection.

**Functions:**
- `createSession(sessionData)` - Create new session with transaction
- `editSession(sessionId, oldSession, newSessionData)` - Move/reschedule session
- `cancelSession(sessionId, sessionData)` - Cancel session
- `executeBookingTransaction(payload)` - Execute booking with conflict check
- `completeSession(sessionId, payload)` - Mark session as complete
- `getEligibleChildrenForSlot(specialization)` - Get patients matching specialization

**Key Features:**
- Uses Firestore transactions for atomicity
- Implements child-level locking to prevent double-booking
- Specialist day-level slot management
- Automatic slot status updates

#### 2. `sessionService.js`
**Purpose**: Session CRUD and schedule generation.

**Functions:**
- `getSessionsByChildId(childId)` - Get all sessions for a patient
- `fetchDailySchedule(targetDate)` - Generate daily schedule grid
- `updateSessionNotes(sessionId, notes)` - Update clinical notes
- `addSession(sessionData)` - Add session with conflict detection

**Key Features:**
- Generates time slots based on specialist working hours
- Auto-completes past sessions
- Merges specialist availability with existing bookings
- Lazy background updates for auto-completion

#### 3. `childService.js`
**Purpose**: Patient management and file operations.

**Functions:**
- `getChildren()` - Fetch all patients
- `getChild(id)` - Fetch single patient
- `addChild(childData)` - Create new patient
- `updateChildProgress(id, data)` - Update patient progress
- `deleteChild(id)` - Delete patient
- `cleanupUnnamedChildren()` - Remove invalid records
- `uploadChildDocument(childId, file, onProgress)` - Upload file
- `deleteChildDocument(childId, attachmentObj)` - Delete file

**Key Features:**
- Firebase Storage integration for attachments
- Progress tracking for uploads
- Array operations for attachment management
- Safe data handling (undefined field prevention)

#### 4. `specialistService.js`
**Purpose**: Specialist management.

**Functions:**
- `getSpecialists()` - Fetch all specialists
- `addSpecialist(specialistData)` - Create specialist
- `updateSpecialist(id, updatedData)` - Update specialist
- `deleteSpecialist(id)` - Delete specialist

**Key Features:**
- Working days normalization (string/number conversion)
- Mock mode support for development
- Default slot configuration

#### 5. `userService.js`
**Purpose**: User account management.

**Functions:**
- `getUserProfile(uid)` - Fetch user profile
- `createUser(userData)` - Create user
- `updateUser(uid, data)` - Update user
- `seedAdminAccount(data)` - Seed initial admin
- `getAllUsers()` - Fetch all users (admin only)

**Key Features:**
- Secondary Firebase Auth instance for account creation
- Admin seeding for initial setup
- Role-based access enforcement

#### 6. `treatmentPlanService.js`
**Purpose**: Treatment plan and goal management.

**Functions:**
- `getTreatmentPlan(childId)` - Fetch treatment plan
- `createTreatmentPlan(childId, data)` - Create plan
- `addGoal(childId, goal)` - Add clinical goal
- `updateGoal(childId, goalId, data)` - Update goal
- `deleteGoal(childId, goalId)` - Delete goal

---

## Components

### Layout Components

#### `Layout.jsx`
Main application wrapper providing:
- Responsive sidebar with mobile toggle
- Top header with language toggle and user info
- Role-based badge styling
- RTL/LTR direction support
- Backdrop for mobile sidebar

#### `Sidebar.jsx`
Navigation sidebar with:
- Role-based menu items
- Active route highlighting
- Collapsible sections
- Logout functionality
- Responsive design

#### `ProtectedRoute.jsx`
Route protection wrapper:
- Authentication check
- Role-based access control
- Redirect to login or unauthorized

### Feature Components

#### `BookingModal.jsx`
Modal for booking appointments:
- Specialist selection
- Patient selection
- Date/time selection
- Diagnosis input
- Conflict detection
- Form validation

### Page Components

#### `Dashboard.jsx` (Admin/Secretary)
Main dashboard featuring:
- Real-time statistics cards
- Specialist workload charts (Recharts)
- Hourly session distribution
- Today's reservations list
- Quick booking capability
- Live session monitoring
- Analytics toggle

#### `Specialists.jsx`
Specialist management:
- Specialist list with search
- Add/edit specialist forms
- Working hours configuration
- Working days selection
- Custom slot generation per day
- Delete confirmation

#### `Children.jsx`
Patient management:
- Patient list with search
- Add patient form
- Diagnosis and age input
- Session count tracking
- Progress status indicators
- Navigation to patient profile

#### `ChildProfile.jsx`
Detailed patient view:
- Clinical profile overview
- Treatment plan management
- Goal setting and tracking
- Session history log
- File attachments (upload/delete)
- Progress visualization
- Status updates

#### `ScheduleGrid.jsx`
Schedule grid view:
- Date navigation
- Specialist rows
- Time slot columns
- Slot status indicators (free/booked/completed)
- Click-to-book functionality
- Real-time updates

#### `MySchedule.jsx` (Specialist)
Specialist personal schedule:
- Filtered to specialist's sessions
- Session completion
- Clinical notes entry
- Patient quick view
- Status tracking

#### Reports

**`WeeklyReport.jsx`**
- Weekly activity overview
- Day-by-day session counts
- Completion rates
- Specialist performance

**`MonthlyReport.jsx`**
- Macro-level clinical analysis
- Total clinical yield
- Completion rate metrics
- Top performer identification
- Daily trajectory charts
- Session density analysis

**`SessionsLog.jsx`**
- Detailed session history
- Searchable by patient/specialist
- Status filtering
- Date/time display
- Participant records

#### `UserManagement.jsx` (Admin only)
- User list with roles
- Add new users
- Role assignment
- Account activation/deactivation
- Specialist linking

#### `Login.jsx`
Authentication page:
- Email/password form
- Admin seeding mode (via ?init=true)
- Network error handling
- Account deactivation check
- Language-aware messages

#### `Unauthorized.jsx`
Access denied page with navigation back.

---

## Internationalization

### Implementation

**Context**: `src/contexts/LanguageContext.jsx`

**Translation Files**:
- `src/locales/en.json` - English (211 keys)
- `src/locales/ar.json` - Arabic (213 keys)

### Features

1. **Language Toggle**
   - Button in header
   - Toggles between English and Arabic
   - Persists preference in localStorage

2. **RTL Support**
   - Automatic direction switching (`dir="rtl"` for Arabic)
   - Layout adjustments for RTL
   - Icon and spacing considerations

3. **Translation Hook**
```javascript
const { t, lang, toggleLanguage } = useTranslation();
t('dashboard') // Returns translated string
```

4. **Key Categories**
   - Navigation (dashboard, specialists, children, schedule)
   - Actions (save, cancel, edit, delete)
   - Status (free, booked, completed, cancelled)
   - Clinical terms (diagnosis, notes, treatment plan)
   - Reports (weekly, monthly, sessions log)
   - Messages (success, error, confirmation)

---

## Security

### Firestore Security Rules (`firestore.rules`)

#### Rule Functions
- `isAuth()` - Checks if user is authenticated
- `getUserData()` - Fetches user document
- `isAdmin()` - Admin role check
- `isSecretary()` - Secretary role check
- `isSpecialist()` - Specialist role check

#### Collection Rules

**`users/{userId}`**
- Read: Any authenticated user
- Write: Admin only

**`secretaries/{secretaryId}`**
- Read: Any authenticated user
- Write: Admin only

**`specialists/{specialistId}`**
- Read: Any authenticated user
- Write: Admin or Secretary

**`children/{childId}`**
- Read/Write: Admin or Secretary

**`sessions/{sessionId}`**
- Write: Admin or Secretary
- Update: Specialist (only own sessions)
- Read: Any authenticated user

#### Default Rule
- All other paths: Deny all access

### Client-Side Security

1. **Route Protection**
   - All protected routes wrapped in `ProtectedRoute`
   - Role-based access enforced
   - Unauthorized redirects

2. **Data Validation**
   - Form validation before submission
   - Required field checks
   - Type validation

3. **Transaction Safety**
   - Booking operations use Firestore transactions
   - Conflict detection before writes
   - Atomic multi-document updates

4. **Input Sanitization**
   - `safe()` function prevents undefined fields
   - File name sanitization for uploads
   - XSS prevention through React

### Best Practices

1. Never expose Firebase config with sensitive keys (API key is public by design)
2. Implement proper error handling without exposing internal details
3. Validate all user inputs on both client and server
4. Use Firestore rules as the final security layer
5. Implement rate limiting in production (via Firebase extensions)

---

## Deployment

### Build Process

1. **Development Build**
```bash
npm run dev
```
- Runs Vite dev server
- Hot module replacement
- Source maps enabled

2. **Production Build**
```bash
npm run build
```
- Creates optimized bundle in `dist/`
- Minification
- Tree shaking
- Asset optimization

3. **Preview Build**
```bash
npm run preview
```
- Serves production build locally
- For testing before deployment

### Deployment Options

#### 1. Firebase Hosting (Recommended)

**Setup:**
```bash
npm install -g firebase-tools
firebase login
firebase init
```

**Deploy:**
```bash
npm run build
firebase deploy
```

**firebase.json configuration:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### 2. Vercel

**Setup:**
- Connect GitHub repository
- Set build command: `npm run build`
- Set output directory: `dist`
- Deploy automatically on push

#### 3. Netlify

**Setup:**
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `dist`
- Add `_redirects` file: `/* /index.html 200`

#### 4. Custom Server

Use any static file server (Nginx, Apache, etc.) to serve the `dist/` directory.

### Environment Variables

For production, consider using environment variables:

**.env.production**
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Update `src/config/firebase.js` to use:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ... other config
};
```

### Performance Optimization

1. **Code Splitting**
   - React Router lazy loading for large pages
   - Dynamic imports for heavy components

2. **Image Optimization**
   - Use WebP format
   - Implement lazy loading
   - Serve responsive images

3. **Caching**
   - Service Worker for offline support
   - Firebase Hosting cache headers
   - SWR for API caching

4. **Bundle Analysis**
```bash
npm run build
npx vite-bundle-visualizer
```

### Monitoring

Consider adding:
- Firebase Analytics
- Sentry for error tracking
- Firebase Performance Monitoring
- Custom logging service

---

## Troubleshooting

### Common Issues

1. **Firebase Initialization Error**
   - Check API key in config
   - Verify Firebase project is enabled
   - Check network connectivity

2. **Authentication Fails**
   - Verify Email/Password auth is enabled in Firebase Console
   - Check user exists in Firestore users collection
   - Verify account is active

3. **Firestore Rules Denied**
   - Check user role in Firestore
   - Verify rules are deployed
   - Check collection names match

4. **RTL Layout Issues**
   - Ensure Tailwind RTL plugin is configured
   - Check CSS direction is set correctly
   - Verify translation keys exist

5. **Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version (18+)
   - Verify all dependencies are installed

---

## Development Guidelines

### Code Style

- Use functional components with hooks
- Prefer custom hooks for reusable logic
- Keep components focused and small
- Use descriptive variable names
- Add JSDoc comments for complex functions

### Git Workflow

1. Create feature branch from main
2. Make commits with clear messages
3. Test thoroughly
4. Create pull request
5. Code review
6. Merge to main

### Testing

Consider adding:
- Unit tests (Jest + React Testing Library)
- Integration tests for services
- E2E tests (Playwright/Cypress)

### Contributing

1. Follow existing code style
2. Add translations for new UI text
3. Update documentation
4. Test across roles (Admin/Secretary/Specialist)
5. Test both languages (English/Arabic)

---

## License

[Add your license information here]

---

## Support

For issues or questions:
- Create an issue in the repository
- Contact development team
- Check Firebase Console for errors

---

**Last Updated**: May 2026
**Version**: 1.0.0
