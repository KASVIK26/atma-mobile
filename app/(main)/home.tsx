import { useUser } from '@/context/UserContext';
import { StudentDashboard } from '@/screens/dashboards/StudentDashboard';
import { TeacherDashboard } from '@/screens/dashboards/TeacherDashboard';

export default function Home() {
  const { userRole } = useUser();

  if (userRole === 'teacher') {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}
