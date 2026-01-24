import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Enrollment } from '../types';
import { getEnrollments } from '../services/enrollments';
import { getCourseContent, getCourseProgress, CourseContentResponse } from '../services/content';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

interface EnrolledCourse {
  enrollment: Enrollment;
  course: CourseContentResponse['course'];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

const StudentDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      setCurrentTime(`${dateString.toUpperCase()} // ${timeString}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const enrollments = await getEnrollments(user.id);
        const paidEnrollments = enrollments.filter((e) => e.payment_status === 'paid');

        const coursesData = await Promise.all(
          paidEnrollments.map(async (enrollment) => {
            try {
              const [content, progress] = await Promise.all([
                getCourseContent(enrollment.course_id),
                getCourseProgress(enrollment.course_id)
              ]);
              const totalLessons = content.sections.reduce((acc, s) => acc + s.lessons.length, 0);
              const completedLessons = progress.filter((p) => p.status === 'completed').length;
              const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

              return {
                enrollment,
                course: content.course,
                totalLessons,
                completedLessons,
                progressPercent
              };
            } catch {
              return {
                enrollment,
                course: {
                  id: enrollment.course_id,
                  title: `Course #${enrollment.course_id}`,
                  description: null,
                  category: null,
                  price: null,
                  thumbnail_url: null,
                  status: 'approved',
                  instructor_id: null
                },
                totalLessons: 0,
                completedLessons: 0,
                progressPercent: 0
              };
            }
          })
        );

        setEnrolledCourses(coursesData);
      } catch (err) {
        console.error(err);
        setError('Failed to load enrolled courses.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  if (!user) return null;

  const totalLessons = enrolledCourses.reduce((acc, course) => acc + course.totalLessons, 0);
  const completedLessons = enrolledCourses.reduce((acc, course) => acc + course.completedLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const primaryCourseId = enrolledCourses[0]?.course.id;

  return (
    <div className="min-h-screen flex">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-full border border-zinc-700 shadow-lg text-white btn-press transition-transform"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside
        className={`sidebar-rail left-4 w-12 rounded-full py-5 gap-6 h-auto top-1/2 -translate-y-1/2 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[150%]'
        } md:translate-x-0`}
      >
        <div className="w-8 h-8 rounded-full bg-black border border-zinc-800 flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-all duration-300 group shadow-inner btn-press shrink-0">
          <svg className="w-4 h-4 fill-white group-hover:fill-acid transition-colors" viewBox="0 0 24 24">
            <path d="M12 2L4 22h3.5l1.5-4h6l1.5 4H20L12 2zm0 5.5L14 15h-4l2-7.5z" />
          </svg>
        </div>

        <nav className="flex flex-col gap-3 items-center">
          <Link to="/dashboard" className="nav-item" title="Dashboard">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
            </svg>
          </Link>
          <Link to="/student/dashboard" className="nav-item active" title="My Learning">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
          </Link>
        </nav>

        <div className="flex flex-col items-center gap-5 mt-auto">
          <div className="status-dot acid" title="Online" />
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 hover:border-zinc-500 hover:shadow-md transition-all duration-200 btn-press shrink-0 flex items-center justify-center text-zinc-400 hover:text-white"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative z-10 h-screen overflow-hidden md:ml-14 transition-all duration-300">
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              My Learning
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">
                {currentTime || 'LOADING...'} // {user.first_name.toUpperCase()} {user.last_name.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 animate-fade-in-up delay-100 pointer-events-auto">
            <Link to="/" className="btn-secondary text-sm hidden md:flex">
              Browse Courses
            </Link>
          </div>
        </header>

        <div className="h-full overflow-y-auto px-6 md:px-10 pb-6 pt-32 scroll-smooth">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {loading ? (
            <LoadingCard message="Loading your courses..." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <div className="stat-card animate-fade-in-up delay-100 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-acid/10 rounded-xl text-lime-600 border border-acid/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                    </div>
                    <span className="txt-label">Enrolled</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">
                    {enrolledCourses.length}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Active courses</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-200 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <span className="txt-label">Completed</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">
                    {completedLessons}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Lessons done</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-300 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17h18v2H3v-2zm0-7h18v2H3V10zm0-7h18v2H3V3z" />
                      </svg>
                    </div>
                    <span className="txt-label">Progress</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">
                    {overallProgress}%
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Overall completion</p>
                </div>

                <Link
                  to={primaryCourseId ? `/learn/${primaryCourseId}` : '/'}
                  className="stat-card animate-fade-in-up delay-400 bg-gradient-to-br from-acid/20 to-transparent border-acid/30 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-acid/10 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-acid text-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow-acid">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <h3 className="text-zinc-900 font-bold">
                    {primaryCourseId ? 'Continue Learning' : 'Browse Courses'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-mono font-medium">
                    {primaryCourseId ? 'Resume last course' : 'Find your next module'}
                  </p>
                </Link>
              </div>

              <div className="space-y-6 animate-fade-in-up delay-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-zinc-900 font-bold flex items-center gap-3 text-lg">
                    <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                    </svg>
                    Enrolled Courses
                  </h2>
                  <span className="txt-label">{enrolledCourses.length} total</span>
                </div>

                {enrolledCourses.length === 0 ? (
                  <div className="glass-card p-12 rounded-2xl text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">No courses yet</h3>
                    <p className="text-sm text-zinc-500 mt-1">Browse the catalog to start learning.</p>
                    <Link to="/" className="btn-primary mt-4 inline-flex">
                      Explore Courses
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {enrolledCourses.map(({ enrollment, course, totalLessons, completedLessons, progressPercent }) => (
                      <div key={enrollment.id} className="glass-card p-5 rounded-2xl flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="txt-label">Course</span>
                          <span className="text-xs font-mono text-zinc-500">{progressPercent}%</span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 mt-2 line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                          {course.description || 'Continue your structured learning path.'}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500 font-mono">
                          <span>{completedLessons}/{totalLessons} lessons</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span>{course.category || 'General'}</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-[10px] mb-2 font-mono uppercase tracking-wider">
                            <span className="text-zinc-500 font-semibold">Progress</span>
                            <span className="text-lime-600 font-bold">{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-acid to-lime-400 h-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <Link
                          to={`/learn/${course.id}`}
                          className="btn-primary mt-4 text-sm"
                        >
                          {progressPercent > 0 ? 'Continue' : 'Start Learning'}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO LEARNING HUB <span className="text-zinc-600 font-bold">v2.0</span></p>
                <div className="flex gap-6 mt-4 md:mt-0">
                  <span className="flex items-center gap-2">
                    STATUS: <span className="text-emerald-600 font-bold">ONLINE</span>
                  </span>
                </div>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboardPage;
