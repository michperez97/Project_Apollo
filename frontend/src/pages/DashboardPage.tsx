import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course, Enrollment, PaymentIntentSession, StudentBalance, Transaction, Announcement } from '../types';
import * as courseApi from '../services/courses';
import * as enrollmentApi from '../services/enrollments';
import * as paymentApi from '../services/payments';
import * as announcementApi from '../services/announcements';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

const defaultCourseForm = {
  code: '',
  name: '',
  description: '',
  credit_hours: 3,
  price_per_credit: 100,
  teacher_id: '',
  semester: 'Fall',
  year: new Date().getFullYear()
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [balance, setBalance] = useState<StudentBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState(defaultCourseForm);
  const [courseSaving, setCourseSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState<number | ''>('');
  const [enrollStudentId, setEnrollStudentId] = useState<number | ''>('');
  const [payingEnrollmentId, setPayingEnrollmentId] = useState<number | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentIntentSession | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const paymentStatusClass = (status: Enrollment['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canManageCourses = useMemo(
    () => user?.role === 'admin' || user?.role === 'teacher',
    [user]
  );
  const canEnrollOthers = useMemo(() => user?.role === 'admin' || user?.role === 'teacher', [user]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const promises: Promise<unknown>[] = [
          courseApi.getCourses(),
          enrollmentApi.getEnrollments(user.role === 'student' ? user.id : undefined),
          announcementApi.getAnnouncements()
        ];

        if (user.role === 'student') {
          promises.push(paymentApi.getBalance());
          promises.push(paymentApi.getTransactions());
        }

        const results = await Promise.all(promises);
        setCourses(results[0] as Course[]);
        setEnrollments(results[1] as Enrollment[]);
        setAnnouncements(results[2] as Announcement[]);

        if (user.role === 'student') {
          setBalance(results[3] as StudentBalance);
          setTransactions(results[4] as Transaction[]);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageCourses) return;
    setCourseSaving(true);
    setError(null);
    try {
      const payload: Omit<Course, 'id'> = {
        code: courseForm.code,
        name: courseForm.name,
        description: courseForm.description,
        credit_hours: Number(courseForm.credit_hours),
        price_per_credit: Number(courseForm.price_per_credit),
        teacher_id: courseForm.teacher_id ? Number(courseForm.teacher_id) : null,
        semester: courseForm.semester,
        year: Number(courseForm.year)
      };
      const created = await courseApi.createCourse(payload);
      setCourses((prev) => [created, ...prev]);
      setCourseForm(defaultCourseForm);
    } catch (err) {
      console.error(err);
      setError('Could not create course (maybe code already exists).');
    } finally {
      setCourseSaving(false);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!canManageCourses) return;
    try {
      await courseApi.deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete course.');
    }
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setEnrolling(true);
    setError(null);
    try {
      const courseId = Number(enrollCourseId);
      if (!courseId) {
        setError('Choose a course to enroll.');
        return;
      }
      const studentId =
        canEnrollOthers && enrollStudentId ? Number(enrollStudentId) : user?.id ?? undefined;
      const enrollment = await enrollmentApi.enroll({
        course_id: courseId,
        student_id: studentId
      });
      setEnrollments((prev) => [enrollment, ...prev]);
      setEnrollCourseId('');
      setEnrollStudentId('');
    } catch (err) {
      console.error(err);
      setError('Could not enroll (maybe already enrolled).');
    } finally {
      setEnrolling(false);
    }
  };

  const beginPayment = async (enrollmentId: number) => {
    if (paymentBusy) return;
    if (!stripeEnabled) {
      setPaymentError('Stripe is not configured.');
      return;
    }
    setPaymentError(null);
    setPaymentMessage(null);
    setPayingEnrollmentId(enrollmentId);
    setPaymentSession(null);
    setPaymentBusy(true);
    try {
      const session = await paymentApi.createPaymentIntent(enrollmentId);
      setPaymentSession(session);
    } catch (err) {
      console.error(err);
      setPaymentError('Could not start payment. Try again later.');
      setPayingEnrollmentId(null);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!stripeEnabled) {
      setPaymentError('Stripe is not configured.');
      return;
    }
    if (!stripe || !elements) {
      setPaymentError('Payment form is not ready.');
      return;
    }
    if (!paymentSession) {
      setPaymentError('No payment session. Start again.');
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setPaymentError('Enter your card details.');
      return;
    }

    setPaymentBusy(true);
    setPaymentError(null);
    setPaymentMessage(null);

    const result = await stripe.confirmCardPayment(paymentSession.clientSecret, {
      payment_method: { card }
    });

    if (result.error) {
      setPaymentError(result.error.message ?? 'Payment failed');
    } else if (result.paymentIntent?.status === 'succeeded') {
      setPaymentMessage('Payment succeeded! Status will update shortly.');
      if (payingEnrollmentId) {
        setEnrollments((prev) =>
          prev.map((enrollment) =>
            enrollment.id === payingEnrollmentId
              ? { ...enrollment, payment_status: 'paid' }
              : enrollment
          )
        );
      }
      setPaymentSession(null);
      setPayingEnrollmentId(null);
    }

    setPaymentBusy(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3 mb-3 sm:mb-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">Project Apollo</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user.first_name} {user.last_name} · {user.role}
              </p>
            </div>
            <button className="btn-secondary text-sm sm:text-base whitespace-nowrap" onClick={logout}>
              Sign out
            </button>
          </div>
          {user.role === 'admin' && (
            <Link className="btn-secondary w-full sm:w-auto text-sm sm:text-base mt-2" to="/admin/finance">
              Financial Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {paymentError && <Alert type="error" message={paymentError} onClose={() => setPaymentError(null)} />}
        {paymentMessage && <Alert type="success" message={paymentMessage} onClose={() => setPaymentMessage(null)} />}
        
        {loading ? (
          <LoadingCard message="Loading dashboard..." />
        ) : (
          <>
            <section className="grid sm:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Courses</h2>
                <div className="space-y-3 max-h-96 overflow-auto pr-1">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold break-words">
                          {course.code} — {course.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {course.credit_hours} credits @ ${course.price_per_credit}/credit
                        </p>
                        <p className="text-sm text-gray-600">
                          {course.semester} {course.year}
                        </p>
                        {course.description && (
                          <p className="text-sm text-gray-700 mt-1 break-words">{course.description}</p>
                        )}
                      </div>
                      <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto">
                        <Link
                          className="text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                          to={`/courses/${course.id}`}
                        >
                          View
                        </Link>
                        {canManageCourses && (
                          <button
                            className="text-sm text-red-600 hover:text-red-700 whitespace-nowrap"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!courses.length && (
                    <EmptyState
                      icon="📚"
                      title="No courses yet"
                      description={canManageCourses ? "Create your first course to get started" : "No courses available"}
                    />
                  )}
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Enrollments</h2>
                {user.role === 'student' && balance && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Total Tuition</p>
                        <p className="font-semibold">
                          ${balance.total_tuition.toFixed(2)} {balance.currency.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Paid</p>
                        <p className="font-semibold text-green-600">
                          ${balance.total_paid.toFixed(2)} {balance.currency.toUpperCase()}
                        </p>
                      </div>
                      {balance.total_refunded > 0 && (
                        <div>
                          <p className="text-gray-600">Refunded</p>
                          <p className="font-semibold text-blue-600">
                            ${balance.total_refunded.toFixed(2)} {balance.currency.toUpperCase()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Balance Due</p>
                        <p
                          className={`font-semibold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          ${balance.balance.toFixed(2)} {balance.currency.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3 max-h-96 overflow-auto pr-1">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold">Course #{enrollment.course_id}</p>
                        <p className="text-sm text-gray-600">
                          Student #{enrollment.student_id} · Tuition ${enrollment.tuition_amount}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Status:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${paymentStatusClass(enrollment.payment_status)}`}
                          >
                            {enrollment.payment_status}
                          </span>
                          <span className="text-gray-400">
                            · {new Date(enrollment.enrolled_at).toLocaleString()}
                          </span>
                        </div>
                        {user.role === 'student' && (
                          <div className="mt-2 space-y-2">
                            {enrollment.payment_status !== 'paid' ? (
                              stripeEnabled ? (
                                <button
                                  className="btn-primary text-sm"
                                  onClick={() => beginPayment(enrollment.id)}
                                  disabled={paymentBusy && payingEnrollmentId === enrollment.id}
                                >
                                  {paymentBusy && payingEnrollmentId === enrollment.id
                                    ? 'Starting payment...'
                                    : 'Pay tuition'}
                                </button>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  Payments are disabled. Set VITE_STRIPE_PUBLISHABLE_KEY.
                                </p>
                              )
                            ) : (
                              <p className="text-xs text-green-600">Tuition paid</p>
                            )}

                            {stripeEnabled && payingEnrollmentId === enrollment.id && paymentBusy && !paymentSession && (
                              <p className="text-xs text-gray-600">Preparing payment form...</p>
                            )}

                            {stripeEnabled && payingEnrollmentId === enrollment.id && paymentSession && (
                              <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                                <p className="text-sm font-medium">
                                  Pay {(paymentSession.amountCents / 100).toFixed(2)}{' '}
                                  {paymentSession.currency.toUpperCase()}
                                </p>
                                <div className="rounded border border-gray-300 p-2 bg-white">
                                  <CardElement />
                                </div>
                                <button
                                  className="btn-primary w-full"
                                  onClick={handleConfirmPayment}
                                  disabled={paymentBusy}
                                >
                                  {paymentBusy ? 'Processing...' : 'Confirm payment'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!enrollments.length && (
                    <EmptyState
                      icon="🎓"
                      title="No enrollments yet"
                      description="Enroll in a course below to get started"
                    />
                  )}
                </div>
              </div>
            </section>

            {canManageCourses && (
              <section className="card">
                <h2 className="text-lg font-semibold mb-3">Create Course</h2>
                <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleCreateCourse}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input
                      className="input"
                      value={courseForm.code}
                      onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      className="input"
                      value={courseForm.name}
                      onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Hours
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={courseForm.credit_hours}
                      onChange={(e) =>
                        setCourseForm((p) => ({ ...p, credit_hours: Number(e.target.value) }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Credit
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={courseForm.price_per_credit}
                      onChange={(e) =>
                        setCourseForm((p) => ({ ...p, price_per_credit: Number(e.target.value) }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <input
                      className="input"
                      value={courseForm.semester}
                      onChange={(e) => setCourseForm((p) => ({ ...p, semester: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      className="input"
                      type="number"
                      min={2024}
                      value={courseForm.year}
                      onChange={(e) => setCourseForm((p) => ({ ...p, year: Number(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="input"
                      value={courseForm.description}
                      onChange={(e) =>
                        setCourseForm((p) => ({ ...p, description: e.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button className="btn-primary w-full sm:w-auto" type="submit" disabled={courseSaving}>
                      {courseSaving ? 'Saving...' : 'Create course'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="card">
              <h2 className="text-lg font-semibold mb-3">Enroll in a Course</h2>
              <form className="grid sm:grid-cols-3 gap-4 items-end" onSubmit={handleEnroll}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    className="input"
                    value={enrollCourseId}
                    onChange={(e) => setEnrollCourseId(Number(e.target.value))}
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {canEnrollOthers && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID
                    </label>
                    <input
                      className="input"
                      type="number"
                      value={enrollStudentId}
                      onChange={(e) => setEnrollStudentId(Number(e.target.value))}
                      placeholder="Student ID"
                    />
                  </div>
                )}

                <div className="sm:col-span-full">
                  <button className="btn-primary w-full" type="submit" disabled={enrolling}>
                    {enrolling ? 'Enrolling...' : 'Enroll'}
                  </button>
                </div>
              </form>
              {user.role === 'student' && (
                <p className="text-sm text-gray-600 mt-2">
                  You will be enrolled as student #{user.id}. Tuition is calculated automatically.
                </p>
              )}
            </section>

            {user.role === 'student' && transactions.length > 0 && (
              <section className="card">
                <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {transactions.slice(0, 10).map((txn) => (
                    <div
                      key={txn.id}
                      className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm gap-2"
                    >
                      <div>
                        <p className="font-medium">
                          {txn.type === 'payment' && 'Payment'}
                          {txn.type === 'refund' && 'Refund'}
                          {txn.type === 'adjustment' && 'Adjustment'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                        {txn.description && (
                          <p className="text-xs text-gray-500 mt-1">{txn.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${txn.type === 'payment' ? 'text-green-600' : txn.type === 'refund' ? 'text-blue-600' : 'text-gray-700'}`}
                        >
                          {txn.type === 'refund' ? '+' : '-'}${txn.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{txn.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {announcements.length > 0 && (
              <section className="card">
                <h2 className="text-lg font-semibold mb-3">Recent Announcements</h2>
                <div className="space-y-3 max-h-96 overflow-auto pr-1">
                  {announcements.slice(0, 5).map((announcement) => (
                    <div
                      key={announcement.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Course #{announcement.course_id}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;

