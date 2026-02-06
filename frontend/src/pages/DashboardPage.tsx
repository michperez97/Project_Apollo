import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course, Enrollment, PaymentIntentSession, StudentBalance, Transaction, Announcement } from '../types';
import * as courseApi from '../services/courses';
import * as enrollmentApi from '../services/enrollments';
import * as paymentApi from '../services/payments';
import * as announcementApi from '../services/announcements';
import * as assistantApi from '../services/assistant';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

const defaultCourseForm = {
  title: '',
  description: '',
  category: '',
  price: 0,
};

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  courses?: Course[];
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const initialAssistantMessage: ChatMessage = {
  id: createMessageId(),
  role: 'assistant',
  content: 'Welcome back. Ask me to find courses by topic and I will share direct links.'
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const paymentStatusClass = (status: Enrollment['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const canManageCourses = useMemo(
    () => user?.role === 'admin' || user?.role === 'instructor',
    [user]
  );
  const canEnrollOthers = useMemo(() => user?.role === 'admin' || user?.role === 'instructor', [user]);

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatSending]);

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
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category || 'General',
        price: Number(courseForm.price),
      };
      const created = await courseApi.createCourse(payload);
      setCourses((prev) => [created, ...prev]);
      setCourseForm(defaultCourseForm);
    } catch (err) {

      setError('Could not create course.');
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

  const handleChatSend = async (override?: string) => {
    const content = (override ?? chatInput).trim();
    if (!content || chatSending) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatError(null);
    setChatSending(true);

    try {
      const data = await assistantApi.sendAssistantMessage(content);
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: data.reply,
        courses: data.courses
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setChatError('Apollo AI is unavailable. Please try again.');
    } finally {
      setChatSending(false);
    }
  };

  if (!user) return null;

  const paidEnrollments = enrollments.filter(e => e.payment_status === 'paid').length;
  const pendingEnrollments = enrollments.filter(e => e.payment_status !== 'paid').length;

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-full border border-zinc-700 shadow-lg text-white btn-press transition-transform"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Rail */}
      <aside className={`sidebar-rail left-4 w-12 rounded-full py-5 gap-6 h-auto top-1/2 -translate-y-1/2 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-[150%]'} md:translate-x-0`}>
        {/* Brand Mark */}
        <div className="w-8 h-8 rounded-full bg-black border border-zinc-800 flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-all duration-300 group shadow-inner btn-press shrink-0">
          <svg className="w-4 h-4 fill-white group-hover:fill-acid transition-colors" viewBox="0 0 24 24">
            <path d="M12 2L4 22h3.5l1.5-4h6l1.5 4H20L12 2zm0 5.5L14 15h-4l2-7.5z" />
          </svg>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-3 items-center">
          <Link to="/dashboard" className="nav-item active" title="Dashboard">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
            </svg>
          </Link>

          {user.role === 'student' && (
            <Link to="/student/dashboard" className="nav-item" title="My Learning">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
              </svg>
            </Link>
          )}

          {(user.role === 'admin' || user.role === 'instructor') && (
            <Link to="/instructor/courses" className="nav-item" title="My Courses">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
              </svg>
            </Link>
          )}

          {user.role === 'admin' && (
            <>
              <Link to="/admin/moderation" className="nav-item" title="Moderation">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </Link>
              <Link to="/admin/finance" className="nav-item" title="Finance">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-5 mt-auto">
          {/* Status dot */}
          <div className="status-dot acid" title="Online" />

          {/* User avatar */}
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

      {/* Main Content */}
      <main className="flex-1 relative z-10 h-screen overflow-hidden md:ml-14 transition-all duration-300">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          {/* Left tile */}
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Overview
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">
                {currentTime || 'LOADING...'} // {user.first_name.toUpperCase()} {user.last_name.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Right elements */}
          <div className="flex items-center gap-4 animate-fade-in-up delay-100 pointer-events-auto">
            <div className="hidden md:flex items-center h-11 bg-white border border-zinc-200 rounded-2xl px-4 w-72 focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-200 transition-all group shadow-md hover:shadow-lg">
              <svg className="w-4 h-4 text-zinc-500 group-focus-within:text-lime-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 14 15.5l.27.28v.79L20 21.5 21.5 20l-5.99-6zM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
              </svg>
              <input
                type="text"
                placeholder="Search modules..."
                className="bg-transparent border-none text-sm text-zinc-900 ml-2 w-full placeholder-zinc-500 focus:placeholder-zinc-400 focus:outline-none font-medium h-full"
              />
              <div className="text-[10px] border border-zinc-200 rounded px-1.5 text-zinc-500 font-mono bg-zinc-50">
                /
              </div>
            </div>

            <button className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all relative group shadow-md hover:shadow-lg">
              <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </button>

            <Link to="/" className="hidden md:flex items-center h-11 bg-white border border-zinc-200 rounded-2xl px-4 shadow-md hover:shadow-lg transition-all text-sm text-zinc-600 hover:text-zinc-900">
              Browse Courses
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto px-6 md:px-10 pb-6 pt-32 scroll-smooth">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {paymentError && <Alert type="error" message={paymentError} onClose={() => setPaymentError(null)} />}
          {paymentMessage && <Alert type="success" message={paymentMessage} onClose={() => setPaymentMessage(null)} />}

          {loading ? (
            <LoadingCard message="Loading dashboard..." />
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                {/* Courses Stat */}
                <div className="stat-card animate-fade-in-up delay-100 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-acid/10 rounded-xl text-lime-600 border border-acid/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                    </div>
                    <span className="txt-label group-hover:text-lime-600 transition-colors">Courses</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{courses.length}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Available</p>
                </div>

                {/* Enrollments Stat */}
                <div className="stat-card animate-fade-in-up delay-200 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" />
                      </svg>
                    </div>
                    <span className="txt-label">Enrollments</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{enrollments.length}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">{paidEnrollments} paid, {pendingEnrollments} pending</p>
                </div>

                {/* Balance Stat (Students only) */}
                {user.role === 'student' && balance && (
                  <div className="stat-card animate-fade-in-up delay-300 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className={`p-2.5 rounded-xl border ${balance.balance > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                        </svg>
                      </div>
                      <span className="txt-label">Balance</span>
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 font-mono tracking-tight ${balance.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      ${balance.balance.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{balance.balance > 0 ? 'Due' : 'Paid in full'}</p>
                  </div>
                )}

                {/* Quick Action Card */}
                {user.role === 'student' && (
                  <Link
                    to="/student/dashboard"
                    className="stat-card animate-fade-in-up delay-400 bg-gradient-to-br from-acid/20 to-transparent border-acid/30 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-acid/10 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-acid text-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow-acid">
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <h3 className="text-zinc-900 font-bold">Continue Learning</h3>
                    <p className="text-xs text-zinc-500 mt-1 font-mono font-medium">View My Courses</p>
                  </Link>
                )}

                {(user.role === 'admin' || user.role === 'instructor') && (
                  <Link
                    to="/instructor/courses"
                    className="stat-card animate-fade-in-up delay-400 bg-gradient-to-br from-acid/20 to-transparent border-acid/30 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-acid/10 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-acid text-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow-acid">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    </div>
                    <h3 className="text-zinc-900 font-bold">Manage Courses</h3>
                    <p className="text-xs text-zinc-500 mt-1 font-mono font-medium">Create & Edit</p>
                  </Link>
                )}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column - Courses */}
                <div className="lg:col-span-2 space-y-6 animate-fade-in-up delay-200">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-zinc-900 font-bold flex items-center gap-3 text-lg">
                      <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                      Available Courses
                    </h2>
                    <span className="txt-label">{courses.length} Total</span>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {courses.map((course) => (
                      <div key={course.id} className="glass-card p-0 rounded-2xl flex flex-col sm:flex-row overflow-hidden group border border-zinc-200 hover:border-acid/50 shadow-sm hover:shadow-md">
                        <div className="w-full sm:w-40 h-24 sm:h-auto bg-zinc-100 relative overflow-hidden flex items-center justify-center">
                          <span className="txt-label">{course.category}</span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between bg-white/50">
                          <div>
                            <h3 className="text-base text-zinc-900 font-bold group-hover:text-lime-600 transition-colors tracking-tight">
                              {course.title}
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{course.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-medium">
                                ${course.price ?? 0}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Link to={`/course/${course.id}`} className="text-xs font-semibold text-zinc-700 hover:text-lime-600 transition-colors">
                              View Details
                            </Link>
                            {canManageCourses && (
                              <button
                                className="text-xs text-red-600 hover:text-red-700 ml-auto"
                                onClick={() => handleDeleteCourse(course.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!courses.length && (
                      <EmptyState
                        icon="books"
                        title="No courses yet"
                        description={canManageCourses ? "Create your first course to get started" : "No courses available"}
                      />
                    )}
                  </div>

                  {/* Create Course Form */}
                  {canManageCourses && (
                    <div className="glass-card p-6 rounded-2xl mt-6">
                      <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-acid rounded-full" />
                        Create Course
                      </h3>
                      <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleCreateCourse}>
                        <div>
                          <label className="txt-label mb-1 block">Title</label>
                          <input
                            className="input"
                            value={courseForm.title}
                            onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="txt-label mb-1 block">Category</label>
                          <input
                            className="input"
                            value={courseForm.category}
                            onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="txt-label mb-1 block">Price</label>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={courseForm.price}
                            onChange={(e) => setCourseForm((p) => ({ ...p, price: Number(e.target.value) }))}
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="txt-label mb-1 block">Description</label>
                          <textarea
                            className="input min-h-[80px]"
                            value={courseForm.description}
                            onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button className="btn-primary w-full sm:w-auto" type="submit" disabled={courseSaving}>
                            {courseSaving ? 'Creating...' : 'Create Course'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Right Column - Enrollments & Activity */}
                <div className="space-y-6 animate-fade-in-up delay-300">
                  {/* Enrollments */}
                  <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-acid rounded-full animate-pulse" />
                        Enrollments
                      </h3>
                    </div>

                    {user.role === 'student' && balance && (
                      <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="txt-label">Total Tuition</p>
                            <p className="font-semibold text-zinc-900 font-mono">${balance.total_tuition.toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="txt-label">Total Paid</p>
                            <p className="font-semibold text-emerald-600 font-mono">${balance.total_paid.toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {enrollments.map((enrollment) => (
                        <div key={enrollment.id} className="border border-zinc-200 rounded-xl p-3 hover:border-zinc-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-zinc-900 text-sm">Course #{enrollment.course_id}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStatusClass(enrollment.payment_status)}`}>
                              {enrollment.payment_status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 font-mono">
                            ${enrollment.tuition_amount} tuition
                          </p>

                          {user.role === 'student' && enrollment.payment_status !== 'paid' && (
                            <div className="mt-3">
                              {stripeEnabled ? (
                                <button
                                  className="btn-accent text-xs py-1.5 w-full"
                                  onClick={() => beginPayment(enrollment.id)}
                                  disabled={paymentBusy && payingEnrollmentId === enrollment.id}
                                >
                                  {paymentBusy && payingEnrollmentId === enrollment.id ? 'Starting...' : 'Pay Tuition'}
                                </button>
                              ) : (
                                <p className="text-xs text-zinc-400">Payments disabled</p>
                              )}

                              {stripeEnabled && payingEnrollmentId === enrollment.id && paymentSession && (
                                <div className="mt-3 border border-zinc-200 rounded-xl p-3 space-y-2 bg-white">
                                  <p className="text-sm font-medium text-zinc-900">
                                    Pay ${(paymentSession.amountCents / 100).toFixed(2)}
                                  </p>
                                  <div className="rounded border border-zinc-200 p-2 bg-white">
                                    <CardElement />
                                  </div>
                                  <button
                                    className="btn-primary w-full text-sm"
                                    onClick={handleConfirmPayment}
                                    disabled={paymentBusy}
                                  >
                                    {paymentBusy ? 'Processing...' : 'Confirm'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {!enrollments.length && (
                        <EmptyState
                          icon="graduation"
                          title="No enrollments"
                          description="Enroll in a course to get started"
                        />
                      )}
                    </div>
                  </div>

                  {/* Enroll Form */}
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4">
                      Enroll in Course
                    </h3>
                    <form className="space-y-3" onSubmit={handleEnroll}>
                      <div>
                        <label className="txt-label mb-1 block">Select Course</label>
                        <select
                          className="input"
                          value={enrollCourseId}
                          onChange={(e) => setEnrollCourseId(Number(e.target.value))}
                          required
                        >
                          <option value="">Choose...</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {canEnrollOthers && (
                        <div>
                          <label className="txt-label mb-1 block">Student ID (optional)</label>
                          <input
                            className="input"
                            type="number"
                            value={enrollStudentId}
                            onChange={(e) => setEnrollStudentId(Number(e.target.value))}
                            placeholder="Leave empty for self"
                          />
                        </div>
                      )}

                      <button className="btn-primary w-full" type="submit" disabled={enrolling}>
                        {enrolling ? 'Enrolling...' : 'Enroll'}
                      </button>
                    </form>
                  </div>

                  {/* Announcements */}
                  {announcements.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl">
                      <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4">
                        Announcements
                      </h3>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto">
                        {announcements.slice(0, 3).map((ann) => (
                          <div key={ann.id} className="border-l-2 border-acid pl-3">
                            <p className="text-sm font-semibold text-zinc-900">{ann.title}</p>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{ann.message}</p>
                            <p className="txt-label mt-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions */}
                  {user.role === 'student' && transactions.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl">
                      <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4">
                        Recent Transactions
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {transactions.slice(0, 5).map((txn) => (
                          <div key={txn.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 capitalize">{txn.type}</p>
                              <p className="txt-label">{new Date(txn.created_at).toLocaleDateString()}</p>
                            </div>
                            <p className={`font-semibold font-mono ${txn.type === 'payment' ? 'text-emerald-600' : 'text-blue-600'}`}>
                              {txn.type === 'refund' ? '+' : '-'}${txn.amount.toFixed(0)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO LEARNING PLATFORM <span className="text-zinc-600 font-bold">v2.0</span></p>
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

      {/* AI Assistant Widget */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
        <div
          className={`mb-4 w-[360px] h-[550px] bg-white rounded-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right border border-zinc-200 shadow-2xl ${
            chatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 pointer-events-none scale-95 translate-y-4'
          }`}
        >
          <div className="h-16 border-b border-zinc-100 bg-white flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-lime-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l1.8 5.5H19l-4.5 3.3L16 16l-4-2.7L8 16l1.5-5.2L5 7.5h5.2L12 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Apollo AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-acid shadow-[0_0_8px_rgba(184,230,0,0.6)] animate-pulse" />
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wide">SYSTEM ONLINE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14h-2v3h3v-2H7v-1zm12-8h-3v2h2v1h2V6h-1zm-2 10h2v-2h-2v2zm-8-8H7V6h2V4H5v4h4V6z" />
                </svg>
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.3 5.7L12 12l6.3 6.3-1.3 1.3L10.7 13.3 4.4 19.6 3.1 18.3 9.4 12 3.1 5.7 4.4 4.4l6.3 6.3 6.3-6.3z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm scroll-smooth bg-zinc-50/50">
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 items-start animate-fade-in-up ${isAssistant ? '' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 6V6a2 2 0 1 1 4 0v2h-4z" />
                      </svg>
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[85%] ${isAssistant ? '' : 'items-end'}`}>
                    <span
                      className={`text-[10px] font-bold ${isAssistant ? 'text-zinc-400 ml-1' : 'text-zinc-500 mr-1'}`}
                    >
                      {isAssistant ? 'APOLLO' : 'YOU'}
                    </span>
                    <div
                      className={`p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-white border border-zinc-100 text-zinc-600 rounded-tl-none'
                          : 'bg-zinc-900 text-white rounded-tr-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.content}</p>
                      {message.courses && message.courses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 grid gap-2">
                          {message.courses.slice(0, 3).map((course) => (
                            <Link
                              key={course.id}
                              to={`/course/${course.id}`}
                              className="border border-zinc-200 rounded-xl p-2 bg-white/90 hover:bg-white transition-colors"
                            >
                              <p className="text-xs font-semibold text-zinc-900">{course.title}</p>
                              <p className="text-[10px] text-zinc-500">
                                {course.category ?? 'General'} · {course.price && course.price > 0 ? `$${course.price}` : 'Free'}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                      {isAssistant && index === 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
                          <button
                            onClick={() => handleChatSend('Find courses about data science')}
                            className="text-[11px] bg-zinc-50 hover:bg-acid/10 hover:text-lime-700 hover:border-acid/20 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            Data Science
                          </button>
                          <button
                            onClick={() => handleChatSend('Find courses about project management')}
                            className="text-[11px] bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            Project Mgmt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-6 1.34-6 3v1h12v-1c0-1.66-2.67-3-6-3z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {chatSending && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Apollo AI is typing...
              </div>
            )}
            {chatError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {chatError}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-zinc-100">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                disabled={chatSending}
                placeholder="Ask for courses by topic..."
                className="w-full bg-white border border-zinc-200 rounded-xl pl-4 pr-12 py-3.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-zinc-300 shadow-sm transition-all font-medium disabled:opacity-60"
              />
              <button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || chatSending}
                className="absolute right-2 top-2 p-1.5 bg-zinc-900 text-white rounded-lg hover:bg-acid hover:text-black transition-colors shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 21l20-9L2 3v7l14 2-14 2v7z" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mt-2">
              <span className="text-[9px] text-zinc-400 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-6 0V6a2 2 0 1 1 4 0v2h-4z" />
                </svg>
                Private & Secure Context
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="group relative w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-acid/20 border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95 z-50"
        >
          <div className="absolute inset-0 rounded-xl border border-acid opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <svg className="w-5 h-5 group-hover:text-lime-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3C7.03 3 3 6.58 3 11c0 2.18 1.05 4.13 2.75 5.56L5 21l4.62-2.01c.77.21 1.57.32 2.38.32 4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acid opacity-30" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-acid border border-white" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
