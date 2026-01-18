import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course, Enrollment, PaymentIntentSession } from '../types';
import * as courseApi from '../services/courses';
import * as enrollmentApi from '../services/enrollments';
import * as paymentApi from '../services/payments';

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
        const [courseData, enrollmentData] = await Promise.all([
          courseApi.getCourses(),
          enrollmentApi.getEnrollments(user.role === 'student' ? user.id : undefined)
        ]);
        setCourses(courseData);
        setEnrollments(enrollmentData);
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Project Apollo</h1>
            <p className="text-sm text-gray-600">
              Signed in as {user.first_name} {user.last_name} · {user.role}
            </p>
          </div>
          <button className="btn-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="p-3 rounded-md bg-red-50 text-red-700">{error}</div>}
        {paymentError && (
          <div className="p-3 rounded-md bg-red-50 text-red-700">{paymentError}</div>
        )}
        {paymentMessage && (
          <div className="p-3 rounded-md bg-green-50 text-green-700">{paymentMessage}</div>
        )}
        {loading ? (
          <div className="card text-center">Loading dashboard...</div>
        ) : (
          <>
            <section className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Courses</h2>
                <div className="space-y-3 max-h-96 overflow-auto pr-1">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {course.code} — {course.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {course.credit_hours} credits @ ${course.price_per_credit}/credit ·{' '}
                          {course.semester} {course.year}
                        </p>
                        {course.description && (
                          <p className="text-sm text-gray-700 mt-1">{course.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          className="text-sm text-primary-600 hover:text-primary-700"
                          to={`/courses/${course.id}`}
                        >
                          View
                        </Link>
                        {canManageCourses && (
                          <button
                            className="text-sm text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!courses.length && (
                    <p className="text-sm text-gray-600">No courses yet. Create the first one.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Enrollments</h2>
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
                    <p className="text-sm text-gray-600">No enrollments yet.</p>
                  )}
                </div>
              </div>
            </section>

            {canManageCourses && (
              <section className="card">
                <h2 className="text-lg font-semibold mb-3">Create Course</h2>
                <form className="grid md:grid-cols-2 gap-4" onSubmit={handleCreateCourse}>
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
                  <div className="md:col-span-2">
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
                  <div className="md:col-span-2">
                    <button className="btn-primary" type="submit" disabled={courseSaving}>
                      {courseSaving ? 'Saving...' : 'Create course'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="card">
              <h2 className="text-lg font-semibold mb-3">Enroll in a Course</h2>
              <form className="grid md:grid-cols-3 gap-4 items-end" onSubmit={handleEnroll}>
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

                <div className="md:col-span-1">
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
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;

