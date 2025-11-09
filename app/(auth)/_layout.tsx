import { Stack } from 'expo-router';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: 'auth',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="welcome"
        options={{
          title: 'Welcome',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="role-selection"
        options={{
          title: 'Choose Role',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />
      <Stack.Screen
        name="student-signup"
        options={{
          title: 'Student Registration',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="teacher-signup"
        options={{
          title: 'Teacher Registration',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
