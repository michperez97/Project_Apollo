import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import * as courseApi from '../services/courses';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import SideNav from '../components/SideNav';

const AdminModerationQueue = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState<{ [key: number]: string }>({});
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await courseApi.getPendingCourses();
        setCourses(data);
      } catch (err) {

        setError('Failed to load pending courses.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const handleApprove = async (courseId: number) => {
    setProcessing(courseId);
    setError(null);
    setSuccess(null);
    try {
      await courseApi.approveCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setSuccess('Course approved successfully');
    } catch (err) {

      setError('Failed to approve course.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (courseId: number) => {
    const feedback = rejectFeedback[courseId];
    if (!feedback?.trim()) {
      setError('Please provide feedback for rejection.');
      return;
    }

    setProcessing(courseId);
    setError(null);
    setSuccess(null);
    try {
      await courseApi.rejectCourse(courseId, feedback.trim());
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setRejectFeedback((prev) => {
        const copy = { ...prev };
        delete copy[courseId];
        return copy;
      });
      setShowRejectForm(null);
      setSuccess('Course rejected');
    } catch (err) {

      setError('Failed to reject course.');
    } finally {
      setProcessing(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="moderation" />

      <main className="flex-1 relative z-10 h-screen overflow-hidden pl-16 transition-all duration-300">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Moderation
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">ADMIN QUEUE</span>
            </div>
          </div>

          <div className="flex items-center gap-3 animate-fade-in-up delay-100 pointer-events-auto">
            <Link to="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
            <button className="btn-secondary text-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto px-6 md:px-10 pb-6 pt-32 scroll-smooth">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

          {loading ? (
            <LoadingCard message="Loading pending courses..." />
          ) : (
            <>
              {/* Stat Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="stat-card animate-fade-in-up delay-100 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                    </div>
                    <span className="txt-label">Pending Review</span>
                  </div>
                  <h3 className="text-4xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{courses.length}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Courses awaiting approval</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-200 bg-gradient-to-br from-emerald-50 to-transparent border-emerald-200">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <span className="txt-label">Quick Action</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">Approve</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Publish course to marketplace</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-300 bg-gradient-to-br from-red-50 to-transparent border-red-200">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 border border-red-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </div>
                    <span className="txt-label">Quick Action</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">Reject</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Return with feedback</p>
                </div>
              </div>

              {/* Course List */}
              <div className="animate-fade-in-up delay-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-zinc-900 font-bold flex items-center gap-3 text-lg">
                    <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                    </svg>
                    Pending Courses
                  </h2>
                  <span className="txt-label">{courses.length} to review</span>
                </div>

                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="glass-card p-0 rounded-2xl overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full md:w-48 h-36 object-cover"
                          />
                        ) : (
                          <div className="w-full md:w-48 h-36 bg-zinc-100 flex items-center justify-center">
                            <span className="txt-label">{course.category}</span>
                          </div>
                        )}
                        <div className="p-5 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg text-zinc-900 font-bold tracking-tight">{course.title}</h3>
                              <p className="text-sm text-zinc-500 mt-1">
                                <span className="font-mono">{course.category}</span> | Instructor #{course.instructor_id}
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          </div>

                          <p className="text-sm text-zinc-600 mt-3 line-clamp-2">{course.description}</p>

                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-sm font-semibold text-zinc-900 font-mono">
                              {course.price == null || course.price === 0 ? 'Free' : `$${course.price.toFixed(0)}`}
                            </span>
                            <span className="txt-label">
                              Created {course.created_at ? new Date(course.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            <button
                              className="btn-primary text-sm py-2 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApprove(course.id)}
                              disabled={processing === course.id}
                            >
                              {processing === course.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              className="btn-secondary text-sm py-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setShowRejectForm(showRejectForm === course.id ? null : course.id)}
                              disabled={processing === course.id}
                            >
                              Reject
                            </button>
                          </div>

                          {showRejectForm === course.id && (
                            <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                              <label className="txt-label mb-2 block">Rejection Feedback (required)</label>
                              <textarea
                                className="input min-h-[80px] w-full"
                                placeholder="Explain why this course is being rejected..."
                                value={rejectFeedback[course.id] || ''}
                                onChange={(e) =>
                                  setRejectFeedback((prev) => ({
                                    ...prev,
                                    [course.id]: e.target.value
                                  }))
                                }
                              />
                              <div className="flex gap-2 mt-3">
                                <button
                                  className="btn-primary text-sm bg-red-600 hover:bg-red-700"
                                  onClick={() => handleReject(course.id)}
                                  disabled={processing === course.id || !rejectFeedback[course.id]?.trim()}
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  className="btn-secondary text-sm"
                                  onClick={() => setShowRejectForm(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!courses.length && (
                    <div className="glass-card p-12 rounded-2xl text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">All caught up!</h3>
                      <p className="text-sm text-zinc-500 mt-1">No pending courses to review</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO ADMIN CONSOLE <span className="text-zinc-600 font-bold">v2.0</span></p>
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

export default AdminModerationQueue;
