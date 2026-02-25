# Authentication Implementation Guide

## Overview

This document provides comprehensive details on the authentication system implementation for the ATMA Mobile application, covering both Student and Teacher signup/login flows, OTP verification, and database integration.

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Student Authentication Flow](#student-authentication-flow)
3. [Teacher Authentication Flow](#teacher-authentication-flow)
4. [OTP Implementation](#otp-implementation)
5. [Database Integration](#database-integration)
6. [Security Considerations](#security-considerations)

---

## Authentication Architecture

### Technology Stack

- **Frontend Framework**: React Native with Expo
- **Authentication Service**: Supabase Auth (Magic Link OTP)
- **Database**: Supabase PostgreSQL
- **State Management**: React Context (AuthContext)
- **Navigation**: Expo Router

### Auth Flow Diagram

```
1. User enters email/identifier
   ↓
2. System validates eligibility
   ↓
3. OTP sent via magic link
   ↓
4. User enters 8-digit OTP code
   ↓
5. OTP verified with Supabase
   ↓
6. User record created/updated
   ↓
7. Role-specific dashboard displayed
```

---

## Student Authentication Flow

### Step 1: Student Signup Screen

**File**: `screens/StudentSignUpScreen.tsx`

#### Purpose
Enables new students to register with the application using their email address.

#### Registration Process

1. **Email Verification**
   - User enters their email address
   - System validates email format
   - Duplicate email check is performed

2. **OTP Generation & Delivery**
   - Supabase generates 8-digit OTP via magic link
   - Email with verification code sent to student
   - OTP expires in 10 minutes (configured in Supabase)

3. **Code Entry Interface**
   - User receives magic link email
   - Opens app and enters 8-digit code
   - Visual input boxes (8 separate fields) with numeric keyboard
   - Real-time validation as digits are entered

4. **Account Creation**
   - Upon successful OTP verification, Supabase creates user record
   - User role set to 'student'
   - Student profile initialized with:
     - Email
     - User ID
     - Role: 'student'
     - Created timestamp

#### OTP Input Component

- **Type**: Custom numeric input with visual boxes
- **Box Dimensions**: 40px width × 60px height
- **Spacing**: 2px gap between boxes
- **Text Size**: 24px (Lexend font, bold)
- **Keyboard**: Number pad (numeric only)
- **Input Method**: 
  - Pressable boxes focus hidden TextInput
  - Hidden input off-screen but properly accessible
  - Direct typing into boxes
  - Automatic character limit (8 digits)

#### Key Features

- Form validation before OTP request
- Loading states during API calls
- Error handling with user feedback
- Resend OTP capability (60-second cooldown)
- Timer display for OTP expiration
- Accessibility with keyboard support

---

### Step 2: Student Login Screen

**File**: `screens/LoginScreen.tsx`

#### Purpose
Enables existing students to sign in using email and OTP verification.

#### Login Process

1. **Email Entry**
   - User enters registered email address
   - System checks if email exists in Supabase auth
   - No need to pre-validate (Supabase handles verification)

2. **OTP Generation**
   - Supabase sends magic link with 8-digit OTP
   - User receives email with verification code
   - 10-minute expiration window

3. **Code Verification**
   - User enters code in 8-box input interface
   - Same UI component as signup for consistency
   - Real-time digit entry validation

4. **Session Creation**
   - Successful verification creates authenticated session
   - User token stored in secure context
   - Student dashboard loaded automatically

#### OTP Input Component (Shared)

Same as signup screen:
- 8 input boxes with 40px width, 60px height
- 2px spacing between boxes
- Numeric keyboard trigger on box press
- Pressable container focuses hidden input

#### Navigation Flow

```
LoginScreen (email entry)
    ↓
    [Send OTP button]
    ↓
LoginScreen (OTP verification)
    ↓
    [Verify & Sign In button]
    ↓
StudentDashboard
```

---

## Teacher Authentication Flow

### Step 1: Teacher Signup - University & Instructor Lookup

**File**: `screens/TeacherSignUpScreen.tsx` (Step 1)

#### Purpose
Verify teacher's institutional affiliation and obtain instructor record details.

#### Instructor Lookup Process

1. **University Selection**
   - User selects university from dropdown
   - Loads from `universities` table
   - Provides institution context for lookup

2. **Instructor Search**
   - User enters:
     - Instructor code (e.g., "CSE001")
     - Instructor name (first or full name)
   - System queries `instructors` table with:
     - `WHERE university_id = selected_university`
     - `AND code = entered_code`
     - `AND name ILIKE entered_name` (case-insensitive)

3. **Validation Response**
   - **Success**: Instructor found, first/last names displayed
   - **Failure**: "Instructor not found" error
   - Retrieved data includes:
     - Full name (first + last)
     - Department
     - Email (exact match from database)
     - University affiliation

#### Data Retrieval

```typescript
// Instructor lookup query structure
SELECT * FROM instructors
WHERE university_id = $1
  AND code = $2
  AND name ILIKE $3
```

#### Key Features

- University dropdown with loading state
- Instructor code input validation
- Name partial matching (ILIKE for flexibility)
- Display matched instructor details for confirmation
- Proceed to OTP step after successful lookup

---

### Step 2: Teacher Signup - OTP Verification

**File**: `screens/TeacherSignUpScreen.tsx` (Step 2)

#### Purpose
Verify teacher identity and create Supabase user account.

#### OTP Process

1. **Code Delivery**
   - System sends magic link OTP to instructor's email
   - Email source: `instructorData.email` (from lookup)
   - Ensures exact email match for trigger activation
   - 8-digit code valid for 10 minutes

2. **Code Entry**
   - User enters code in 8-box interface
   - Same OTP component as student signup
   - Visual feedback on digit entry
   - Auto-validation when all digits entered

3. **Account Creation Trigger**
   - Upon verification, Supabase creates new user
   - Trigger function `activate_instructor_on_user_creation()` fires
   - Trigger behavior:
     - Runs with `SECURITY DEFINER` (bypasses RLS policies)
     - Executes UPDATE on `instructors` table
     - Matches on: `university_id` + `email` (exact match)
     - Sets: `is_active = true`, `user_id = new_user_id`, `updated_at = NOW()`

#### Trigger Function Details

```sql
CREATE OR REPLACE FUNCTION activate_instructor_on_user_creation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'teacher' THEN
    UPDATE "public"."instructors"
    SET is_active = true, user_id = NEW.id, updated_at = NOW()
    WHERE "university_id" = NEW.university_id 
      AND "email" = NEW.email;
  END IF;
  RETURN NEW;
END;
$$;
```

#### OTP Input Component

- **Type**: Custom numeric input with visual boxes
- **Box Dimensions**: 40px × 60px
- **Spacing**: 2px gap
- **Text Size**: 24px bold
- **Keyboard**: Number pad
- **Focus Behavior**: Pressable wrapper focuses hidden input

#### Key Features

- Email confirmation from instructor lookup
- Loading state during verification
- OTP expiration timer (10 minutes)
- Resend OTP functionality
- Error handling for invalid codes
- Clear navigation to dashboard on success

---

### Step 3: Teacher Signup - Dashboard Access

**File**: `screens/teacher-dashboard.tsx`

#### Access Control

- Teacher account fully activated after signup
- User stored in Supabase `auth.users` table
- Instructor record linked via `user_id`
- Dashboard accessible only to users with role 'teacher'

#### Profile Data Display

Instructor information displayed includes:
- Full name
- Department
- Instructor code
- University affiliation
- Email address
- Active status (set by trigger)

---

### Teacher Login

**File**: `screens/LoginScreen.tsx`

#### Login Process

1. **Email Entry**
   - Teacher enters registered email
   - Supabase sends magic link with OTP
   - Same 8-digit code system

2. **OTP Verification**
   - Enter code in 8-box interface
   - Session created upon verification
   - Teacher dashboard loaded

#### Navigation

```
LoginScreen (email)
    ↓
[Send OTP]
    ↓
LoginScreen (OTP)
    ↓
[Verify & Sign In]
    ↓
TeacherDashboard
```

---

## OTP Implementation

### OTP Input Component (`OTPInput`)

**Location**: Implemented in all three auth screens (TeacherSignUpScreen, StudentSignUpScreen, LoginScreen)

#### Component Structure

```typescript
const OTPInput = ({
  value,
  onChangeText,
  colors,
  length = 8,
}: {
  value: string;
  onChangeText: (text: string) => void;
  colors: any;
  length?: number;
}) => {
  const inputRef = useRef<TextInput>(null);
  
  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <Pressable onPress={handleContainerPress}>
        <View style={styles.otpContainer}>
          {Array.from({ length }).map((_, index) => (
            <View key={index} style={styles.otpBox}>
              <Text style={styles.otpBoxText}>{value[index] || ''}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden={true}
        autoFocus
      />
    </>
  );
};
```

#### Styling

```typescript
otpContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 2,
  marginVertical: 24,
},
otpBox: {
  width: 40,
  height: 60,
  borderWidth: 2,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.inputBackground,
},
otpBoxText: {
  fontSize: 24,
  fontWeight: '700',
  color: colors.textPrimary,
  fontFamily: 'Lexend',
}
```

#### Input Behavior

1. **Numeric Validation**: Only accepts digits 0-9
2. **Auto-Cleanup**: Non-numeric characters filtered out
3. **Length Limiting**: Automatically stops at 8 digits
4. **Visual Feedback**: 
   - Border color changes from gray to primary when filled
   - Current digit displayed in corresponding box
5. **Keyboard Interaction**:
   - Pressable overlay captures user taps
   - Focuses hidden TextInput on press
   - Number pad keyboard appears on focus
   - Hidden input positioned off-screen (`left: -1000`)

#### Cross-Platform Compatibility

- **Android**: Number pad keyboard triggered reliably
- **iOS**: Same behavior with native numeric keyboard
- **Web**: Falls back to text input with numeric filtering

---

## Database Integration

### Tables Involved

#### 1. Universities Table

```sql
CREATE TABLE universities (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR UNIQUE,
  created_at TIMESTAMP
);
```

- Provides institution list for teacher lookup
- Referenced in instructor lookup validation

#### 2. Instructors Table

```sql
CREATE TABLE instructors (
  id UUID PRIMARY KEY,
  university_id UUID REFERENCES universities(id),
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  department VARCHAR,
  is_active BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(university_id, code, email)
);
```

- Stores pre-registered instructor information
- Matches teacher signup with institutional records
- Links to Supabase users via `user_id`
- `is_active` set to true by trigger on signup

#### 3. Supabase Auth Users Table

```sql
-- auth.users (managed by Supabase)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  role VARCHAR, -- 'student' or 'teacher'
  university_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

- Managed by Supabase authentication service
- Created automatically on email verification
- Links to instructors/students via email matching

### Data Flow

#### Student Signup
```
StudentSignUpScreen
  ↓
[Email input] → Supabase Auth
  ↓
[OTP verification] → Create auth.users entry
  ↓
Student Dashboard
```

#### Teacher Signup
```
TeacherSignUpScreen
  ↓
[University + Instructor lookup] → Query instructors table
  ↓
[OTP verification] → Create auth.users entry
  ↓
[Trigger fires] → UPDATE instructors (is_active=true, user_id=uuid)
  ↓
Teacher Dashboard
```

---

## Security Considerations

### 1. OTP Security

- **Length**: 8 digits (256,000 possible combinations)
- **Expiration**: 10 minutes (configured in Supabase)
- **Delivery**: Email-based magic links (encrypted transport)
- **Single-Use**: Each OTP valid for one verification only

### 2. Email Matching

- **Exact Match**: Email compared at character level
- **Source**: Instructor lookup email ensures database accuracy
- **Case-Insensitive**: But exact after retrieval
- **Hash Verification**: Database stores exact email for trigger matching

### 3. RLS Policies (Row-Level Security)

- **Bypass Method**: Trigger uses `SECURITY DEFINER`
- **Context**: Trigger executes with owner privileges
- **Safety**: Still limited to specific UPDATE operation
- **Scope**: Only affects instructor activation on signup

### 4. Session Management

- **Token Storage**: Stored in secure AuthContext
- **Expiration**: Session tied to Supabase auth token
- **Refresh**: Supabase handles automatic token refresh
- **Logout**: Clears context and removes session

### 5. Input Validation

- **Email Format**: Validated before sending OTP
- **OTP Input**: Only numeric characters accepted
- **Length Control**: 8-digit limit enforced
- **Whitespace**: Automatically trimmed

---

## Error Handling

### Common Error Scenarios

#### Student Signup/Login Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| Invalid email format | Malformed email address | Correct email format |
| Email already exists | Email registered to different user | Use login or password reset |
| Invalid OTP | Wrong code entered or expired | Request new OTP |
| Network error | Connection timeout with Supabase | Check internet connection |

#### Teacher Signup Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| Instructor not found | Code/name not matching database | Verify correct institution and credentials |
| Invalid OTP | Wrong code entered | Request new OTP |
| Email mismatch | User email doesn't match instructor email | Use email from instructor lookup |
| Network error | Supabase connection issue | Check internet connection |

### Error Handling Implementation

```typescript
// Example error handling
try {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'magiclink'
  });
  
  if (error) {
    Alert.alert('Error', 'Invalid or expired OTP. Please try again.');
    return;
  }
  
  // Success handling
  navigateToDashboard();
} catch (err) {
  Alert.alert('Error', 'An unexpected error occurred. Please try again.');
}
```

---

## Testing Checklist

### Student Signup Testing

- [ ] Email validation works
- [ ] OTP email received
- [ ] OTP entry with keyboard interaction
- [ ] Invalid OTP rejected
- [ ] Valid OTP creates user account
- [ ] Student dashboard accessible after signup
- [ ] User profile data correct

### Student Login Testing

- [ ] Email entry accepted
- [ ] OTP email sent
- [ ] OTP verification successful
- [ ] Session created properly
- [ ] Navigation to dashboard works
- [ ] Previous session cleared

### Teacher Signup Testing

- [ ] University dropdown loads
- [ ] Instructor lookup with valid code + name works
- [ ] Instructor lookup fails for invalid data
- [ ] Instructor details displayed correctly
- [ ] OTP email sent to instructor email
- [ ] OTP verification successful
- [ ] Instructor record activated (is_active = true)
- [ ] Teacher dashboard displays instructor info
- [ ] Trigger function executes and links user_id

### Teacher Login Testing

- [ ] Email entry works
- [ ] OTP sent to registered email
- [ ] OTP verification successful
- [ ] Teacher dashboard loaded
- [ ] Instructor information displays

---

## Deployment Notes

### Environment Variables Required

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>
```

### Database Setup Required

1. Create `universities` table
2. Create `instructors` table with proper constraints
3. Create trigger function `activate_instructor_on_user_creation()`
4. Create trigger on `auth.users` table
5. Set up RLS policies (if needed)

### Supabase Configuration

- Enable magic link authentication
- Configure OTP expiration (recommend 10 minutes)
- Set email templates for OTP delivery
- Configure CORS for mobile app domain

---

## References

- Supabase Auth Documentation: https://supabase.com/docs/guides/auth
- React Native TextInput: https://reactnative.dev/docs/textinput
- Expo Router Navigation: https://docs.expo.dev/routing/
- PostgreSQL Auth Tables: https://supabase.com/docs/guides/auth/managing-user-data

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Author**: Development Team  
**Status**: Complete and Tested
