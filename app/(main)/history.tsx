import { useAuth } from '@/context/AuthContext';
import { StudentAttendanceHistoryScreen } from '@/screens/StudentAttendanceHistoryScreen';
import { TeacherAttendanceHistoryScreen } from '@/screens/TeacherAttendanceHistoryScreen';

export default function History() {
  const { userRole } = useAuth();

  if (userRole === 'teacher') {
    return <TeacherAttendanceHistoryScreen />;
  }

  return <StudentAttendanceHistoryScreen />;
}
