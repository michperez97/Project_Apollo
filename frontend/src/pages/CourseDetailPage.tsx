import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCourseContent, CourseContentResponse } from '../services/content';
import { createCheckoutSession } from '../services/payments';
import { getEnrollments } from '../services/enrollments';
import { Enrollment } from '../types';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import { SUBSCRIPTION_MONTHLY_PRICE } from '../config/pricing';

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<CourseContentResponse | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseCheckoutBusy, setCourseCheckoutBusy] = useState(false);
  const [subscriptionCheckoutBusy, setSubscriptionCheckoutBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!courseId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getCourseContent(Number(courseId));
        setContent(data);

        if (user) {
          const enrollments = await getEnrollments(user.id);
          const found = enrollments.find((e) => e.course_id === Number(courseId));
          setEnrollment(found || null);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, user]);

  const refreshEnrollment = async (targetCourseId: number, userId: number) => {
    const enrollments = await getEnrollments(userId);
    const found = enrollments.find((item) => item.course_id === targetCourseId);
    setEnrollment(found || null);
  };

  const handleCourseCheckout = async () => {
    if (!courseId || !user) return;
    setCourseCheckoutBusy(true);
    setError(null);
    try {
      const result = await createCheckoutSession({ mode: 'payment', courseId: Number(courseId) });
      if (result.checkout?.url) {
        window.location.href = result.checkout.url;
      } else if (result.enrollment) {
        setEnrollment(result.enrollment);
      }
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as { response?: { data?: { error?: string } } };
      const message = axiosError.response?.data?.error || (err instanceof Error ? err.message : 'Failed to enroll');
      if (message.includes('Already enrolled')) {
        await refreshEnrollment(Number(courseId), user.id);
      } else {
        setError(message);
      }
    } finally {
      setCourseCheckoutBusy(false);
    }
  };

  const handleSubscriptionCheckout = async () => {
    if (!user) return;

    setSubscriptionCheckoutBusy(true);
    setError(null);
    try {
      const result = await createCheckoutSession({ mode: 'subscription' });
      if (result.checkout?.url) {
        window.location.href = result.checkout.url;
      }
    } catch (err: unknown) {
      console.error(err);
      const axiosError = err as { response?: { data?: { error?: string } } };
      const message = axiosError.response?.data?.error || (err instanceof Error ? err.message : 'Failed to start subscription checkout');
      setError(message);
    } finally {
      setSubscriptionCheckoutBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <LoadingCard message="Loading course..." />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen px-6 md:px-10 py-10">
        <Alert type="error" message="Course not found" />
        <Link to="/" className="btn-secondary mt-4 inline-flex">
          Back to Home
        </Link>
      </div>
    );
  }

  const { course, sections, hasFullAccess } = content;
  const isEnrolled = enrollment && enrollment.payment_status === 'paid';
  const isStudent = user?.role === 'student';
  const hasActiveSubscription = Boolean(
    user &&
      user.subscription_status === 'active' &&
      (!user.current_period_end || new Date(user.current_period_end).getTime() > Date.now())
  );
  const hasCourseAccess = Boolean(hasFullAccess || isEnrolled || hasActiveSubscription);
  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);

  return (
    <div className="min-h-screen">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="btn-secondary text-sm">
          Back to Catalog
        </Link>
        {user && (
          <span className="txt-label">
            Signed in as {user.first_name.toUpperCase()} {user.last_name.toUpperCase()}
          </span>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-10 pb-12 space-y-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <section className="glass-card p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-72 h-44 bg-zinc-100 border border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="txt-label">COURSE PREVIEW</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="txt-label">{course.category || 'General'}</span>
                {!hasFullAccess && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    Preview
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">
                {course.title}
              </h1>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                {course.description || 'A guided course built for modern learners.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <div className="panel-technical p-3">
                  <p className="txt-label">Price</p>
                  <p className="font-mono text-lg text-zinc-900">
                    {course.price == null || Number(course.price) === 0 ? 'Free' : `$${Number(course.price).toFixed(0)}`}
                  </p>
                </div>
                <div className="panel-technical p-3">
                  <p className="txt-label">Lessons</p>
                  <p className="font-mono text-lg text-zinc-900">{totalLessons}</p>
                </div>
                <div className="panel-technical p-3">
                  <p className="txt-label">Sections</p>
                  <p className="font-mono text-lg text-zinc-900">{sections.length}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {isStudent && hasCourseAccess ? (
                  <Link to={`/learn/${course.id}`} className="btn-primary">
                    Continue Learning
                  </Link>
                ) : user ? (
                  <>
                    {isStudent ? (
                      <div className="w-full grid gap-3 sm:grid-cols-2">
                        <div className="border border-zinc-200 rounded-xl p-4 bg-white/70">
                          <p className="txt-label mb-1">Option 1</p>
                          <h3 className="text-sm font-bold text-zinc-900">Buy this Course</h3>
                          <p className="text-xs text-zinc-600 mt-1 mb-3">
                            Lifetime access for this course only.
                          </p>
                          <p className="font-mono text-lg text-zinc-900 mb-3">
                            {course.price == null || Number(course.price) === 0 ? 'Free' : `$${Number(course.price).toFixed(0)}`}
                          </p>
                          <button
                            className="btn-primary w-full"
                            onClick={handleCourseCheckout}
                            disabled={courseCheckoutBusy || subscriptionCheckoutBusy}
                          >
                            {courseCheckoutBusy
                              ? 'Processing...'
                              : course.price == null || Number(course.price) === 0
                                ? 'Enroll for Free'
                                : 'Buy this Course'}
                          </button>
                        </div>

                        <div className="border border-zinc-200 rounded-xl p-4 bg-white/70">
                          <p className="txt-label mb-1">Option 2</p>
                          <h3 className="text-sm font-bold text-zinc-900">Get All-Access</h3>
                          <p className="text-xs text-zinc-600 mt-1 mb-3">
                            Monthly subscription for all current courses.
                          </p>
                          <p className="font-mono text-lg text-zinc-900 mb-3">
                            ${SUBSCRIPTION_MONTHLY_PRICE.toFixed(0)}/mo
                          </p>
                          <button
                            className="btn-secondary w-full"
                            onClick={handleSubscriptionCheckout}
                            disabled={hasActiveSubscription || courseCheckoutBusy || subscriptionCheckoutBusy}
                          >
                            {hasActiveSubscription
                              ? 'Subscription Active'
                              : subscriptionCheckoutBusy
                                ? 'Starting Checkout...'
                                : 'Get All-Access'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link to="/dashboard" className="btn-primary">
                        Go to Dashboard
                      </Link>
                    )}
                  </>
                ) : (
                  <Link to="/login" className="btn-primary">
                    Sign in to Enroll
                  </Link>
                )}
                <Link to="/" className="btn-secondary">
                  Back to Catalog
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900">Course Curriculum</h2>
            <span className="txt-label">{sections.length} sections</span>
          </div>

          {sections.length === 0 ? (
            <p className="text-zinc-500">No content available yet.</p>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.id} className="border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="bg-zinc-50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">{section.title}</span>
                    <span className="txt-label">{section.lessons.length} lessons</span>
                  </div>
                  <ul className="divide-y divide-zinc-200">
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-700">{lesson.title}</span>
                          {lesson.is_preview && (
                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-acid/30 text-zinc-700">
                              Preview
                            </span>
                          )}
                        </div>
                        {lesson.duration_seconds && (
                          <span className="text-sm text-zinc-500 font-mono">
                            {Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CourseDetailPage;
