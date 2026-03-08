# ATMA Mobile - Auth System Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js expo-secure-store
```

### 2. Configure .env
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Schema Script
- Copy `TABLES_SCHEMA.sql` content
- Paste in Supabase SQL editor
- Execute to create all tables

## 📚 Core Files

### `context/AuthContext.tsx`
Main authentication context. Provides:
- `useAuth()` - Access auth state and methods
- `useAuthLoading()` - Check if loading
- `useStudentData()` - Get student enrollments
- `useTeacherData()` - Get instructor data

### `lib/supabase.ts`
Supabase client initialization with secure session storage

### `.env`
Environment configuration with Supabase credentials

## 🔐 Using Authentication

### In Any Screen
```typescript
import { useAuth } from '@/context/AuthContext';

export default function MyScreen() {
  const { 
    isAuthenticated,
    isStudent,
    isTeacher,
    userProfile,
    enrollments,
    signOut,
  } = useAuth();

  if (!isAuthenticated) {
    return <Text>Please login</Text>;
  }

  return (
    <View>
      <Text>Welcome {userProfile?.first_name}</Text>
      {isStudent && <Text>Student ID: {userProfile?.enrollment_id}</Text>}
    </View>
  );
}
```

### Sign In
```typescript
const { signIn } = useAuth();

const handleLogin = async () => {
  const { error } = await signIn('email@university.edu', 'password123');
  if (error) {
    alert('Login failed: ' + error.message);
  }
  // On success, automatically navigated to /(main)/home
};
```

### Sign Out
```typescript
const { signOut } = useAuth();

const handleLogout = async () => {
  await signOut();
  // Automatically navigated to /(auth)/welcome
};
```

### Get User Data
```typescript
const { userProfile, enrollments, isStudent } = useAuth();

if (isStudent && enrollments) {
  console.log('My courses:', enrollments.length);
  enrollments.forEach(enrollment => {
    console.log(`Course: ${enrollment.course_id}, Batch: ${enrollment.batch}`);
  });
}
```

## 🗄️ Database Schema Reference

### users table
```
id: UUID (from Supabase Auth)
university_id: UUID
email: VARCHAR
role: 'student' | 'teacher' | 'admin'
first_name: VARCHAR
last_name: VARCHAR
enrollment_id: VARCHAR (for students)
instructor_code: VARCHAR (for teachers)
is_active: BOOLEAN
last_login: TIMESTAMP
```

### student_enrollments table
```
id: UUID
student_id: UUID → users.id
section_id: UUID → sections.id
course_id: UUID → courses.id
batch: INTEGER (1, 2, 3 for lab batches)
is_active: BOOLEAN
enrollment_date: TIMESTAMP
```

### instructors table
```
id: UUID
user_id: UUID → users.id
name: VARCHAR
code: VARCHAR
email: VARCHAR
department: VARCHAR
profile_picture_url: VARCHAR
is_active: BOOLEAN
```

## 🔄 Auth State Flow

```
App Start
    ↓
AuthProvider initializes
    ↓
getSession() from Supabase
    ↓
If session exists:
  - setSession(session)
  - fetchUserProfile(user.id)
  - If student: fetchStudentEnrollments()
  - If teacher: fetchInstructorData()
    ↓
Listen for onAuthStateChange()
    ↓
On sign in/out, update state automatically
    ↓
useEffect in root layout redirects based on auth state
```

## 🛡️ Route Protection

Protected routes (require authentication):
- `/(main)/home`
- `/(main)/history`
- `/(main)/profile`
- `/(main)/classes`
- `/(main)/view-schedule`

Public routes (always accessible):
- `/(auth)/welcome`
- `/(auth)/login`
- `/(auth)/role-selection`
- `/(auth)/student-signup`
- `/(auth)/teacher-signup`

## 📝 Type Definitions

```typescript
// From AuthContext.tsx

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'teacher' | 'admin';
  enrollment_id?: string;          // Students
  branch_id?: string;              // Students
  semester_id?: string;            // Students
  batch?: number;                  // Students
  instructor_code?: string;        // Teachers
  department?: string;             // Teachers
  profile_picture_url?: string;
  is_active: boolean;
}

interface StudentEnrollment {
  id: string;
  course_id: string;
  section_id: string;
  batch: number;
  is_active: boolean;
  enrollment_date: string;
}

interface InstructorData {
  id: string;
  name: string;
  code?: string;
  email?: string;
  department?: string;
  profile_picture_url?: string;
}
```

## ⚠️ Common Issues

### "useAuth must be used within AuthProvider"
**Cause:** Using useAuth() outside of AuthProvider
**Fix:** Ensure component is inside (main) group

### "Missing EXPO_PUBLIC_SUPABASE_URL"
**Cause:** .env file not configured
**Fix:** Add credentials to .env and restart app

### "Invalid login credentials"
**Cause:** Wrong email/password or user doesn't exist
**Fix:** 
- Check Supabase Auth → Users for the user
- Check users table has profile matching the auth user
- Verify email is correct

### App stuck on loading
**Cause:** Supabase initialization error
**Fix:**
- Check .env credentials
- Verify network connection
- Check browser console for errors

## 🎯 What Happens When

### On App Launch
1. AuthProvider initializes
2. Attempts to restore session from secure storage
3. If valid session found, fetches user profile
4. Calls onAuthStateChange listener
5. RootLayout checks auth state
6. If authenticated → redirect to /(main)/home
7. If not → redirect to /(auth)/welcome

### On Login
1. LoginScreen calls signIn(email, password)
2. Supabase authenticates credentials
3. If success → session created
4. authStateChange listener triggered
5. Fetches user profile from users table
6. Sets isLoading to false
7. RootLayout redirect to /(main)/home based on role

### On Logout
1. Call signOut()
2. Supabase signs out
3. Clear all local state
4. authStateChange listener triggered
5. RootLayout redirects to /(auth)/welcome

### On Profile Update
1. Call updateUserProfile({ first_name: 'Jane' })
2. Updates users table
3. Updates local userProfile state
4. Auto-syncs if another device updates profile

## 🚀 Next Steps

Ready to implement:
1. ✨ Full signup/registration flow
2. ✨ Email verification
3. ✨ University selection
4. ✨ Student enrollment verification
5. ✨ Profile completion
6. ✨ Password reset

Just share the edit boxes view and we'll build it!
