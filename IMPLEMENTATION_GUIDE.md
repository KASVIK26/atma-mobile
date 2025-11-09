# 🎓 ATMA Mobile - UI Implementation Guide

## Overview

This document provides a comprehensive guide to the 5 pixel-perfect screens created for the ATMA Mobile app, following the Stitch design system and React Native best practices.

## 📱 Screens Implemented

### 1. **Welcome Screen** (`WelcomeScreen.tsx`)
**Purpose**: Initial onboarding screen introducing the app

**Key Features**:
- ✨ Hero illustration with image
- 🎯 Headline and subtitle text
- 🔘 Gradient primary button (Get Started)
- 📝 Privacy & Terms link
- 📱 Responsive layout for all screen sizes

**Component Structure**:
```
SafeAreaView
├── ScrollView
│   ├── Main Content Area
│   │   ├── Illustration Container
│   │   └── Text Container (Title + Subtitle)
│   └── Footer Content
│       ├── Primary Button
│       └── Privacy Text
```

**Styling**:
- Light background (#F8FAFC)
- Primary button with hover effect
- Centered layout with proper spacing
- Safe area considerations for notches

---

### 2. **Role Selection Screen** (`RoleSelectionScreen.tsx`)
**Purpose**: Allow users to choose between Student and Teacher roles

**Key Features**:
- 🎓 Student role card with benefits
- 👨‍🏫 Teacher role card with benefits
- ✅ Checkmark icons for each benefit
- 🎨 Icon-based visual differentiation
- 🖱️ Interactive card press animations

**Component Structure**:
```
SafeAreaView
├── ScrollView
│   ├── Header Content
│   │   ├── Title
│   │   └── Subtitle
│   └── Roles Container
│       ├── RoleCard (Student)
│       │   ├── Icon Container
│       │   ├── Title
│       │   └── Benefits List
│       └── RoleCard (Teacher)
│           ├── Icon Container
│           ├── Title
│           └── Benefits List
```

**Styling**:
- Card-based design with shadows
- Active/pressed state animations (scale 0.95)
- Success color for checkmarks
- Proper spacing and padding throughout

---

### 3. **Login Screen** (`LoginScreen.tsx`)
**Purpose**: Authenticate existing users

**Key Features**:
- 📧 Email input field with validation
- 🔐 Password field with show/hide toggle
- 🔗 Forgot Password link
- ✅ Form validation (email format, password length)
- 🔄 Loading state on submit button
- 🖇️ Sign up link for new users
- ⚠️ Error message display

**Component Structure**:
```
SafeAreaView
├── ScrollView
│   ├── Header
│   │   ├── Title
│   │   └── Subtitle
│   ├── Card
│   │   ├── Email TextInput
│   │   ├── Password TextInput
│   │   ├── Forgot Password Link
│   │   └── Login Button
│   └── Footer
│       └── Sign Up Link
```

**Validation Logic**:
- Email format check using regex
- Password minimum length (6 chars)
- Required field validation
- Real-time error display

**User Interactions**:
- Password visibility toggle
- Loading state prevents multiple submissions
- Forgot password navigation
- Signup redirection

---

### 4. **Student Sign Up Screen** (`StudentSignUpScreen.tsx`)
**Purpose**: Register new student users

**Key Features**:
- 📷 Avatar upload with photo button
- 📝 Full Name input
- 📧 Email input
- 🏫 University dropdown/input
- 📚 Enrollment Number input
- 🔐 Password creation with validation
- ✅ Confirm Password field
- 🔄 Password mismatch detection
- 🔐 Show/hide password toggles
- 📱 Google & Apple OAuth options
- 🖇️ Login link for existing users

**Component Structure**:
```
SafeAreaView
├── ScrollView
│   ├── Header (with back button)
│   ├── Avatar Section
│   │   ├── Avatar Display
│   │   └── Upload Button
│   ├── Form Fields
│   │   ├── Full Name TextInput
│   │   ├── Email TextInput
│   │   ├── University TextInput
│   │   ├── Enrollment Number TextInput
│   │   ├── Password TextInput
│   │   └── Confirm Password TextInput
│   ├── Submit Button
│   ├── Login Link
│   ├── Divider
│   └── Social Auth Buttons
│       ├── Google Button
│       └── Apple Button
```

**Validation Rules**:
- Full Name: required, non-empty
- Email: required, valid email format
- University: required, non-empty
- Enrollment: required, non-empty
- Password: required, minimum 8 characters
- Confirm Password: must match password field

**Special Features**:
- Custom avatar component with initials fallback
- Image upload integration point
- Social authentication buttons
- Form auto-fill prevention

---

### 5. **Teacher Sign Up Screen** (`TeacherSignUpScreen.tsx`)
**Purpose**: Register new teacher users

**Key Features**:
- 📷 Avatar upload with photo button
- 🏫 University dropdown/input (placed first)
- 📝 Full Name input
- 📧 Email input
- 🔐 Password creation
- ✅ Confirm Password field
- 🔐 Show/hide password toggles
- 📱 Google OAuth option
- 🖇️ Login link

**Component Structure**:
```
SafeAreaView
├── ScrollView
│   ├── Header (with back button)
│   ├── Avatar Section
│   │   ├── Avatar Display
│   │   ├── Upload Button
│   │   └── Upload Label
│   ├── Form Fields
│   │   ├── University TextInput (Priority field)
│   │   ├── Full Name TextInput
│   │   ├── Email TextInput
│   │   ├── Create Password TextInput
│   │   └── Confirm Password TextInput
│   ├── Submit Button
│   ├── Login Link
│   ├── Divider
│   └── Social Auth Button
│       └── Google Button
```

**Differences from Student SignUp**:
- University field appears first (institutional verification)
- Single OAuth option (Google only)
- Simpler form focused on teacher requirements
- No enrollment number required

---

## 🎨 Design System Usage

### Colors Used
- **Primary**: #2563EB (blue) - Buttons, links, accents
- **Accent**: #06B6D4 (cyan) - Secondary actions
- **Success**: #10B981 (green) - Checkmarks, confirmations
- **Danger**: #EF4444 (red) - Errors, warnings
- **Background Light**: #F8FAFC - Main background
- **Text Light**: #1F2937 - Primary text
- **Text Muted**: #64748B - Secondary text
- **Border**: #CBD5E1 - Input borders

### Typography
- **Font Family**: Lexend (custom, modern sans-serif)
- **Display**: 30px, bold - Main headlines
- **H1**: 24px, bold - Screen titles
- **H3**: 20px, semibold - Section headers
- **Body**: 16px, regular - Main text
- **Label**: 14px, medium - Form labels
- **Caption**: 12px, regular - Helper text

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px
- 3xl: 32px

### Border Radius
- sm: 8px - Small elements
- md: 12px - Input fields
- lg: 16px - Cards
- xl: 20px - Large buttons
- full: 999px - Circular elements

---

## 🛠️ Component Architecture

### Reusable Components

#### Button Component
```tsx
<Button
  variant="primary" | "secondary" | "outline" | "ghost"
  size="sm" | "md" | "lg"
  disabled={boolean}
  loading={boolean}
  onPress={() => {}}
>
  Button Text
</Button>
```

#### TextInput Component
```tsx
<TextInput
  label="Field Label"
  placeholder="Enter value"
  value={value}
  onChangeText={(text) => {}}
  error={errorMessage}
  secureTextEntry={boolean}
  keyboardType="email-address" | "default" | "numeric"
  rightElement={<Icon />}
/>
```

#### Card Component
```tsx
<Card
  onPress={() => {}}
  disabled={boolean}
>
  Card Content
</Card>
```

#### Header Component
```tsx
<Header
  title="Screen Title"
  showBackButton={boolean}
  onBackPress={() => {}}
  rightElement={<Element />}
/>
```

#### Avatar Component
```tsx
<Avatar
  size="sm" | "md" | "lg" | "xl"
  source={require('image.png')}
  initials="AB"
  onPress={() => {}}
/>
```

#### RoleCard Component
```tsx
<RoleCard
  title="Role Name"
  icon="school"
  benefits={['Benefit 1', 'Benefit 2', 'Benefit 3']}
  onPress={() => {}}
/>
```

---

## 📁 Project Structure

```
atma-mobile/
├── types/
│   ├── auth.ts              # Authentication types
│   └── ui.ts                # UI component types
├── constants/
│   ├── colors.ts            # Color palette
│   ├── typography.ts        # Font sizes & weights
│   ├── spacing.ts           # Spacing scale
│   └── strings.ts           # User-facing strings
├── components/
│   └── ui/
│       ├── Button.tsx       # Primary button
│       ├── TextInput.tsx    # Form input
│       ├── Card.tsx         # Card container
│       ├── Header.tsx       # Top app bar
│       ├── Avatar.tsx       # User avatar
│       ├── RoleCard.tsx     # Role selection card
│       ├── Separator.tsx    # Visual divider
│       └── index.ts         # Exports
├── screens/
│   ├── WelcomeScreen.tsx
│   ├── RoleSelectionScreen.tsx
│   ├── LoginScreen.tsx
│   ├── StudentSignUpScreen.tsx
│   ├── TeacherSignUpScreen.tsx
│   └── index.ts             # Exports
└── app/                      # Router (expo-router)
```

---

## ✨ Best Practices Implemented

### 1. **Component Composition**
- Small, focused components with single responsibility
- Reusable UI components for consistency
- Screen components orchestrate smaller components

### 2. **TypeScript**
- Strict type safety with interfaces
- Props validation using TypeScript types
- No `any` types in component definitions

### 3. **Styling**
- Centralized constants for colors, spacing, typography
- StyleSheet.create() for performance
- Consistent naming conventions
- Easy theming support

### 4. **Accessibility**
- Semantic HTML-like structure
- Touchable areas properly sized (min 44pt × 44pt)
- Clear visual feedback for interactions
- Proper use of MaterialIcons

### 5. **Form Handling**
- Real-time validation
- Clear error messages
- Password visibility toggles
- Loading states during submission

### 6. **Navigation**
- Proper use of expo-router
- Back button functionality
- Navigation state management
- Deep linking support ready

### 7. **Performance**
- Lazy component rendering
- ScrollView with proper content sizing
- Minimal re-renders
- Optimized image loading

### 8. **User Experience**
- Smooth animations (scale transforms)
- Loading indicators
- Error feedback
- Success confirmations

---

## 🚀 Usage Examples

### Integrating Screens into Navigation

```tsx
// app/_layout.tsx or app/(auth)/_layout.tsx
import {
  WelcomeScreen,
  RoleSelectionScreen,
  LoginScreen,
  StudentSignUpScreen,
  TeacherSignUpScreen,
} from '@/screens';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="role-selection"
        component={RoleSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="student-signup"
        component={StudentSignUpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="teacher-signup"
        component={TeacherSignUpScreen}
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
```

### Using Screens Programmatically

```tsx
import { useRouter } from 'expo-router';

export function MyComponent() {
  const router = useRouter();

  return (
    <Button onPress={() => router.push('/login')}>
      Go to Login
    </Button>
  );
}
```

---

## 🔌 Integration Points

### API Integration
All screens have TODO comments for API integration:
- `LoginScreen.tsx`: User authentication
- `StudentSignUpScreen.tsx`: Student registration
- `TeacherSignUpScreen.tsx`: Teacher registration

### State Management
Ready for Redux/Context integration:
- Auth state can be managed globally
- User data persistence
- Session management

### Image Handling
Image picker integration points:
- `StudentSignUpScreen.tsx`: Avatar upload (line ~280)
- `TeacherSignUpScreen.tsx`: Avatar upload (line ~280)

---

## 📋 Testing Checklist

- [ ] All screens render without errors
- [ ] Navigation between screens works
- [ ] Form validation displays errors correctly
- [ ] Password visibility toggles work
- [ ] Buttons show loading state
- [ ] Cards respond to press events
- [ ] Avatar upload buttons trigger image picker
- [ ] Social auth buttons show placeholders
- [ ] Responsive layout on different screen sizes
- [ ] Dark mode compatibility
- [ ] Keyboard avoidance for inputs

---

## 🎯 Next Steps

1. **Connect Authentication**: Link to your Supabase backend
2. **Implement Image Picker**: Use `expo-image-picker` for avatars
3. **Add Loading States**: Global loading indicator component
4. **Error Handling**: Implement error boundary
5. **Theme Toggle**: Add dark mode support
6. **Navigation Guards**: Implement auth guards
7. **API Services**: Create API client for backend calls

---

## 📞 Support

For questions or issues with the UI implementation:
1. Check component prop types in `types/ui.ts`
2. Review constants in `constants/` folder
3. Check component examples in respective screen files

---

**Last Updated**: November 9, 2025  
**Framework**: React Native + Expo Router  
**UI System**: Stitch Design System  
**TypeScript Version**: 5.9.2
