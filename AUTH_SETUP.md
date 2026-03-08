# ATMA Mobile - Authentication Setup Guide

## Installation

### 1. Install Required Packages

```bash
npm install @supabase/supabase-js expo-secure-store
```

Or with yarn:
```bash
yarn add @supabase/supabase-js expo-secure-store
```

## Environment Setup

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Database Setup (Supabase)

### 3. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Once the project is ready, go to the SQL editor

### 4. Execute Schema Script

Run the `TABLES_SCHEMA.sql` file in Supabase SQL editor to create all tables:
1. Copy entire contents of `TABLES_SCHEMA.sql`
2. Paste into Supabase SQL editor
3. Click "Run"

This will create:
- **universities** - Root table for multi-tenancy
- **users** - Core user table (student, teacher, admin roles)
- **instructors** - Public instructor reference data
- **student_enrollments** - Student enrollment tracking
- **courses** - Course catalog
- **sections** - Course sections/batches
- And 20+ other tables for attendance, scheduling, etc.

### 5. Configure Row Level Security (RLS)

Enable RLS policies for security (this will be added in the next phase):

```sql
-- Users can only view/edit their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Students can only see their own enrollments
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
```

## Authentication Flow

### Current Flow

```
Welcome Screen (/(auth)/welcome)
    ↓
Login Screen (/(auth)/login) OR Sign Up (/(auth)/role-selection)
    ↓
[Supabase Auth - Email/Password]
    ↓
[Create/Fetch User Profile from 'users' table]
    ↓
Role Detection (student/teacher/admin)
    ↓
Home Screen (/(main)/home)
    ├── Student → StudentDashboard
    └── Teacher → TeacherDashboard
```

## API Structure

### AuthContext (`context/AuthContext.tsx`)

Main auth context providing:

#### Methods
- **signUp(email, password, firstName, lastName, role, university_id)**
  - Creates Supabase auth user
  - Creates profile in `users` table
  
- **signIn(email, password)**
  - Authenticates with Supabase
  - Fetches user profile
  - Updates last_login timestamp

- **signOut()**
  - Signs out from Supabase
  - Clears all local state

- **updateUserProfile(updates)**
  - Updates user profile in `users` table

#### Properties
- **session** - Current Supabase session object
- **user** - Supabase User object
- **userProfile** - Complete user profile from `users` table
- **enrollments** - Student enrollments (if student)
- **instructor** - Instructor data (if teacher)
- **isAuthenticated** - Boolean auth status
- **isStudent/isTeacher/isAdmin** - Role checks

#### Hooks
- **useAuth()** - Access full auth context
- **useAuthLoading()** - Check if auth is still initializing
- **useStudentData()** - Get student-specific data
- **useTeacherData()** - Get teacher-specific data

## Testing

### 1. Create Test User in Supabase Auth

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Email: `student@university.edu`
4. Password: Any password (min 6 chars)

### 2. Create User Profile in Database

In Supabase SQL editor:
```sql
INSERT INTO universities (name, short_code) 
VALUES ('Test University', 'TU');

INSERT INTO users (
  id, university_id, email, first_name, last_name, role, is_active
) VALUES (
  'user-uuid-from-auth',
  'university-uuid',
  'student@university.edu',
  'John',
  'Doe',
  'student',
  true
);
```

### 3. Test Login

1. Run app: `npm start`
2. Go to Login Screen
3. Enter test credentials
4. Should see StudentDashboard on success

## Next Phase - Login Logic

The app is now ready for you to share the edit boxes view so we can:

1. **Add signup flow** - Connect to user role and enrollment data
2. **Add university selection** - Multi-tenant support
3. **Add profile completion** - Capture additional student/teacher data
4. **Add password reset** - Email-based password recovery
5. **Add email verification** - Confirm user email before login
6. **Add enrollment validation** - Verify students are enrolled in correct courses

## Folder Structure

```
context/
├── AuthContext.tsx         # Main auth state & logic
├── ThemeContext.tsx        # Existing theme management
└── UserContext.tsx         # Legacy (can be removed after testing)

lib/
└── supabase.ts            # Supabase client initialization

screens/
├── LoginScreen.tsx         # Login with auth integration
├── RoleSelectionScreen.tsx # Role selection for signup
├── StudentSignUpScreen.tsx # Student registration
├── TeacherSignUpScreen.tsx # Teacher registration
└── dashboards/
    ├── StudentDashboard.tsx
    └── TeacherDashboard.tsx

app/
├── _layout.tsx            # Root layout with AuthProvider
├── (auth)/                # Auth routes
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── login.tsx
│   ├── role-selection.tsx
│   ├── student-signup.tsx
│   └── teacher-signup.tsx
└── (main)/                # Protected routes
    ├── _layout.tsx
    ├── home.tsx           # Conditional dashboard
    ├── history.tsx        # Conditional attendance history
    ├── profile.tsx
    └── ...
```

## Error Handling

The app handles these authentication errors:

- **Invalid credentials** - Shows "Invalid email or password"
- **Email not confirmed** - Prompts to check email
- **User not found** - Shows generic error
- **Network error** - Shows alert with error message
- **Account inactive** - Check `is_active` field in users table

## Security Notes

1. **Session Storage** - Uses `expo-secure-store` for native, `localStorage` for web
2. **Token Auto-Refresh** - Supabase automatically refreshes expired tokens
3. **Route Protection** - AuthContext automatically redirects unauthenticated users
4. **Password Storage** - Never stored locally, only in Supabase Auth
5. **Email Verification** - Should be enabled in Supabase settings

## Troubleshooting

### "Missing EXPO_PUBLIC_SUPABASE_URL"
- Ensure .env file has both SUPABASE_URL and ANON_KEY
- Restart app after adding env vars

### "Invalid login credentials"
- Verify user exists in Supabase Auth
- Check user profile exists in `users` table
- Confirm email and password are correct

### "useAuth must be used within AuthProvider"
- Ensure component is inside (main) group or wrapped by AuthProvider
- Check if AuthProvider is in root _layout.tsx

### App stuck on loading screen
- Check browser console for errors
- Verify Supabase credentials are correct
- Clear app cache and restart

## Next Steps

1. Share edit boxes view
2. Implement signup with enrollment/university selection
3. Add profile completion for students
4. Integrate attendance marking with auth
5. Add role-based access control to specific features
