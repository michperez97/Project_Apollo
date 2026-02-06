import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CoursePage from './pages/CoursePage';
import AdminFinancialDashboard from './pages/AdminFinancialDashboard';
import LandingPage from './pages/LandingPage';
import InstructorCoursesPage from './pages/InstructorCoursesPage';
import AdminModerationQueue from './pages/AdminModerationQueue';
import CourseDetailPage from './pages/CourseDetailPage';
import CoursePlayerPage from './pages/CoursePlayerPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import QuizPage from './pages/QuizPage';
import CertificatePage from './pages/CertificatePage';
import InstructorQuizBuilder from './pages/InstructorQuizBuilder';
import CourseBuilderPage from './pages/CourseBuilderPage';
import ProfilePage from './pages/ProfilePage';
import InstructorPublicProfile from './pages/InstructorPublicProfile';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/course/:courseId" element={<CourseDetailPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <ProtectedRoute>
            <CoursePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learn/:courseId"
        element={
          <ProtectedRoute>
            <CoursePlayerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:quizId"
        element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificate/:certificateId"
        element={
          <ProtectedRoute>
            <CertificatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/finance"
        element={
          <ProtectedRoute>
            <AdminFinancialDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute>
            <InstructorCoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/builder"
        element={
          <ProtectedRoute>
            <CourseBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/quizzes"
        element={
          <ProtectedRoute>
            <InstructorQuizBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <ProtectedRoute>
            <AdminModerationQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/instructor/:userId" element={<InstructorPublicProfile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
