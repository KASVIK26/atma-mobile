import { useAuth } from '@/context/AuthContext';
import { StudentDashboard } from '@/screens/dashboards/StudentDashboard';
import { TeacherDashboard } from '@/screens/dashboards/TeacherDashboard';

export default function Home() {
  const { isTeacher, isStudent } = useAuth();

  // Show role-specific dashboard
  if (isTeacher) {
    return <TeacherDashboard />;
  }

  // Default to student dashboard
  return <StudentDashboard />;
}
