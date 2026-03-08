# ATMA Mobile - Project Structure & Auth Integration

## 📂 Current Project Structure

```
atma-mobile/
├── app/
│   ├── _layout.tsx                    [UPDATED] Root layout with AuthProvider
│   ├── (auth)/                        Protected auth routes
│   │   ├── _layout.tsx                Auth navigation stack
│   │   ├── welcome.tsx                Welcome screen
│   │   ├── login.tsx                  Wrapper for LoginScreen
│   │   ├── role-selection.tsx         Role selection for signup
│   │   ├── student-signup.tsx         Student registration
│   │   └── teacher-signup.tsx         Teacher registration
│   └── (main)/                        Protected main app routes
│       ├── _layout.tsx                Main navigation with tabs
│       ├── home.tsx                   [UPDATED] Role-based dashboard
│       ├── history.tsx                [UPDATED] Role-based attendance
│       ├── profile.tsx                User profile (to be updated)
│       ├── classes.tsx                Class listing
│       └── view-schedule.tsx          Schedule viewer
│
├── context/
│   ├── AuthContext.tsx                [NEW] Complete auth system
│   ├── ThemeContext.tsx               Existing theme management
│   └── UserContext.tsx                Legacy (remove after testing)
│
├── lib/
│   └── supabase.ts                    [NEW] Supabase client
│
├── screens/
│   ├── LoginScreen.tsx                [UPDATED] With auth integration
│   ├── RoleSelectionScreen.tsx        Signup flow (to be updated)
│   ├── StudentSignUpScreen.tsx        Student registration (to be updated)
│   ├── TeacherSignUpScreen.tsx        Teacher registration (to be updated)
│   ├── StudentAttendanceHistoryScreen.tsx
│   ├── TeacherAttendanceHistoryScreen.tsx
│   ├── ViewScheduleScreen.tsx
│   ├── ProfileScreen.tsx              (to be updated with auth)
│   └── dashboards/
│       ├── StudentDashboard.tsx       Works with auth
│       └── TeacherDashboard.tsx       Works with auth
│
├── components/
│   ├── BottomTabBar.tsx
│   ├── StatsCard.tsx
│   ├── QuickActionButton.tsx
│   ├── UpcomingClassCard.tsx
│   └── [others]
│
├── hooks/
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
│
├── constants/
│   └── theme.ts
│
├── assets/
│   ├── images/
│   │   ├── ATMA-LOGO.png
│   │   ├── profile-icon*.png
│   │   └── [others]
│   └── [fonts, etc]
│
├── ui-designs/                        UI design references
│   ├── login_screen/
│   ├── select_your_role/
│   ├── student_sign_up/
│   ├── teacher_sign_up/
│   ├── welcome_to_atma/
│   ├── teacher_dashboard/
│   ├── student_attendance_history/
│   └── teacher_attendance_history/
│
├── .env                               [NEW] Environment variables
├── .env.example                       [NEW] Config template
├── AUTH_SETUP.md                      [NEW] Setup guide
├── AUTH_QUICK_REFERENCE.md            [NEW] Quick reference
├── IMPLEMENTATION_SUMMARY.md          [NEW] Summary of changes
├── TABLES_SCHEMA.sql                  Database schema (attached)
├── package.json                       Dependencies
├── tsconfig.json                      TypeScript config
└── app.json                           Expo config
```

## 🔐 Authentication Architecture

### 1. Supabase Auth (Identity Provider)
- Email/Password authentication
- Session management
- Token refresh
- User creation

### 2. AuthContext (State Management)
- Manages session state
- Fetches user profile from database
- Handles role-based data fetching
- Provides auth methods to entire app

### 3. Protected Routes
- AuthProvider checks auth state
- Automatically redirects unauthenticated users to /(auth)/welcome
- Automatically redirects authenticated users to /(main)/home

### 4. Database (users table)
- Stores user profile with role
- Links to Supabase Auth via UUID
- Extends auth with app-specific fields

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE AUTH                               │
│  (Email/Password, Sessions, Tokens, Auth State)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                ┌────────▼──────────┐
                │   AuthContext     │
                │  (useAuth hook)   │
                └────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐  ┌─────▼──────┐  ┌────▼────┐
    │  users   │  │ student_   │  │instructor
    │  table   │  │ enrollments│  │s table
    │          │  │            │  │
    │ id       │  │ id         │  │ id
    │ email    │  │ student_id │  │ user_id
    │ role     │  │ course_id  │  │ name
    │ name     │  │ section_id │  │ code
    │ etc      │  │ batch      │  │ etc
    └──────────┘  └────────────┘  └────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────▼──────────────┐
         │   useAuth() in Components    │
         │   - Access user profile      │
         │   - Access enrollments       │
         │   - Call signIn/signOut      │
         └───────────────┬──────────────┘
                         │
         ┌───────────────▼──────────────┐
         │   UI Components              │
         │   - LoginScreen              │
         │   - StudentDashboard         │
         │   - TeacherDashboard         │
         │   - AttendanceHistory        │
         └──────────────────────────────┘
```

## 📊 User Flow Diagram

### Complete User Journey

```
┌─────────────────────┐
│  App Launches       │
│  (User Not Logged)  │
└──────────┬──────────┘
           │
     ┌─────▼────────────┐
     │  Welcome Screen  │
     │  /(auth)/welcome │
     └─────┬────────────┘
           │
      ┌────▼─────────────────┐
      │  Has Account?        │
      └─┬──────────────────┬─┘
        │ Yes              │ No
        │                  │
   ┌────▼──────────────┐  │
   │  Login Screen     │  │
   │  - Email input    │  │
   │  - Password input │  │
   │  - Sign In button │  │
   └────┬──────────────┘  │
        │                 │
        │  ┌──────────────▼────────────────┐
        │  │ Role Selection Screen         │
        │  │ - Student button              │
        │  │ - Teacher button              │
        │  └──────────────┬────────────────┘
        │                 │
        │          ┌──────┴──────┐
        │          │             │
        │   ┌──────▼────────┐  ┌─▼───────────┐
        │   │ Student Signup│  │ Teacher     │
        │   │ Screen        │  │ Signup      │
        │   │ - Email       │  │ Screen      │
        │   │ - Password    │  │ - Email     │
        │   │ - Name        │  │ - Password  │
        │   │ - Enrollment  │  │ - Name      │
        │   │ - Branch      │  │ - Dept      │
        │   └──────┬────────┘  └──┬──────────┘
        │          │              │
        └──────────┼──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Supabase Auth Create    │
       │  signUp()                │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Create User Profile     │
       │  INSERT into users table │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Email Verification      │
       │  [Link sent to email]    │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Return to Login Screen  │
       │  "Check your email"      │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  User Clicks Verify Link │
       │  (Email confirms)        │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────┐
       │  Can Now Login           │
       │  Enter email & password  │
       └───────────┬──────────────┘
                   │
       ┌───────────▼──────────────────────────┐
       │  Supabase Auth Verification          │
       │  signIn(email, password)             │
       │  Session created & stored securely   │
       └───────────┬──────────────────────────┘
                   │
       ┌───────────▼──────────────────────────┐
       │  Fetch User Profile from Database    │
       │  SELECT * FROM users WHERE id = ... │
       └───────────┬──────────────────────────┘
                   │
       ┌───────────▼──────────────────────────┐
       │  Role Detection                      │
       │  if (role === 'student')             │
       │    → Fetch enrollments               │
       │  else if (role === 'teacher')        │
       │    → Fetch instructor data           │
       └───────────┬──────────────────────────┘
                   │
       ┌───────────▼──────────────────────────┐
       │  Update last_login Timestamp         │
       │  UPDATE users SET last_login = NOW()│
       └───────────┬──────────────────────────┘
                   │
       ┌───────────▼──────────────────────────┐
       │  AuthContext Auto-Navigation         │
       │  /(main)/home                        │
       └───────────┬──────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────▼────────┐  ┌───────▼───────┐
    │  Student    │  │  Teacher      │
    │  Dashboard  │  │  Dashboard    │
    │             │  │               │
    │ - Courses   │  │ - Classes     │
    │ - Schedule  │  │ - Stats       │
    │ - History   │  │ - Actions     │
    └─────────────┘  └───────────────┘
```

## 🔑 Key Integration Points

### 1. Root Layout (`app/_layout.tsx`)
```typescript
<AuthProvider>
  <CustomThemeProvider>
    <Stack>
      {/* Routes */}
    </Stack>
  </CustomThemeProvider>
</AuthProvider>
```

### 2. Protected Routes
```typescript
// /(main)/_layout.tsx automatically protected
// Only accessible if useAuth() shows isAuthenticated = true
// Otherwise redirected to /(auth)/welcome
```

### 3. In Components
```typescript
const { isAuthenticated, userProfile, signOut } = useAuth();
```

### 4. Database Integration
```typescript
// On login: Fetches from users table
// On role check: Uses users.role field
// On student data: Fetches student_enrollments table
// On teacher data: Fetches instructors table
```

## 📝 Files Summary

| File | Status | Purpose |
|------|--------|---------|
| `.env` | ✅ NEW | Environment configuration |
| `.env.example` | ✅ NEW | Config template |
| `lib/supabase.ts` | ✅ NEW | Supabase client |
| `context/AuthContext.tsx` | ✅ NEW | Auth state & logic |
| `app/_layout.tsx` | ✅ UPDATED | Added AuthProvider |
| `screens/LoginScreen.tsx` | ✅ UPDATED | Using signIn() |
| `app/(main)/home.tsx` | ✅ UPDATED | Using useAuth() |
| `app/(main)/history.tsx` | ✅ UPDATED | Using useAuth() |
| `AUTH_SETUP.md` | ✅ NEW | Setup guide |
| `AUTH_QUICK_REFERENCE.md` | ✅ NEW | Quick ref |
| `IMPLEMENTATION_SUMMARY.md` | ✅ NEW | Summary |
| `PROJECT_STRUCTURE.md` | ✅ NEW | This file |

## ⏭️ Next Phase

Once you share the edit boxes view, we'll implement:

1. **Student Signup Flow**
   - University selection
   - Enrollment ID validation
   - Branch/semester selection
   - Profile completion

2. **Teacher Signup Flow**
   - University selection
   - Employee ID validation
   - Department selection
   - Profile picture upload

3. **Email Verification**
   - Send verification email
   - Confirm email before login
   - Resend verification link

4. **Password Reset**
   - Forgot password link
   - Email verification
   - New password entry

5. **Profile Management**
   - View full profile
   - Edit profile info
   - Update picture
   - Change password

## 🎯 Status

✅ **Complete**
- Supabase integration
- AuthContext implementation
- Route protection
- Database schema
- LoginScreen integration
- Dashboard routing

🟡 **Pending**
- NPM packages installation
- Supabase credentials
- Signup flow implementation
- Email verification
- Profile completion

🚀 **Ready to Go**
Share the edit boxes and we'll build it!
