import { useUser } from '@/context/UserContext';
import { StudentAttendanceHistoryScreen } from '@/screens/StudentAttendanceHistoryScreen';
import { TeacherAttendanceHistoryScreen } from '@/screens/TeacherAttendanceHistoryScreen';

export default function History() {
  const { userRole } = useUser();

  if (userRole === 'teacher') {
    return <TeacherAttendanceHistoryScreen />;
  }

  return <StudentAttendanceHistoryScreen />;
}
