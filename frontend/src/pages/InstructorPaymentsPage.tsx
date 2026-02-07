import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { InstructorEarningsSummary, CourseRevenueBreakdown, InstructorTransaction } from '../types';
import * as paymentApi from '../services/payments';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import SideNav from '../components/SideNav';

/* ── Pure-SVG mini charts (no library needed) ── */

const normalizeSeries = (values: number[], fallback: number): number[] => {
  if (!values.length) {
    return [fallback, fallback * 1.01 + 0.01];
  }
  if (values.length === 1) {
    const point = values[0];
    return [point * 0.98, point];
  }
  return values;
};

const buildSmoothPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length < 2) {
    return '';
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const controlX = (prev.x + curr.x) / 2;
    path += ` Q ${controlX} ${prev.y} ${curr.x} ${curr.y}`;
  }
  return path;
};

const RobinhoodChart = ({
  data,
  tone
}: {
  data: number[];
  tone: 'emerald' | 'blue' | 'lime' | 'violet';
}) => {
  const series = normalizeSeries(data, 0);
  const w = 140;
  const h = 44;
  const pad = 3;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const first = series[0];
  const last = series[series.length - 1];

  const toneColorMap: Record<typeof tone, string> = {
    emerald: '#10b981',
    blue: '#2563eb',
    lime: '#84cc16',
    violet: '#8b5cf6'
  };
  const fallColor = '#ef4444';
  const isUp = last >= first;
  const strokeColor = isUp ? toneColorMap[tone] : fallColor;
  const gradientId = `rh-grad-${tone}-${isUp ? 'up' : 'down'}`;

  const points = series.map((value, index) => ({
    x: pad + (index / (series.length - 1)) * (w - pad * 2),
    y: pad + (1 - (value - min) / range) * (h - pad * 2)
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h - 1} L ${points[0].x} ${h - 1} Z`;
  const baselineY = points[0].y;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-11 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.34} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <line
        x1={pad}
        x2={w - pad}
        y1={baselineY}
        y2={baselineY}
        stroke={strokeColor}
        strokeWidth={0.8}
        strokeDasharray="2 2"
        opacity={0.18}
      />
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.7} fill={strokeColor} />
    </svg>
  );
};

type ConnectBusyAction = 'onboard' | 'dashboard' | 'refresh';

const InstructorPaymentsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [earnings, setEarnings] = useState<InstructorEarningsSummary | null>(null);
  const [courses, setCourses] = useState<CourseRevenueBreakdown[]>([]);
  const [transactions, setTransactions] = useState<InstructorTransaction[]>([]);
  const [connectStatus, setConnectStatus] = useState<paymentApi.InstructorStripeConnectStatus | null>(null);
  const [connectBusy, setConnectBusy] = useState<ConnectBusyAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connectQueryState = useMemo(
    () => new URLSearchParams(location.search).get('connect'),
    [location.search]
  );

  const connectBanner = useMemo(() => {
    if (connectQueryState === 'return') {
      return 'Stripe onboarding returned. Refresh status to confirm payouts are fully enabled.';
    }
    if (connectQueryState === 'refresh') {
      return 'Stripe onboarding was refreshed. Continue the setup to enable payouts.';
    }
    return null;
  }, [connectQueryState]);

  // Derive chart data from already-fetched transactions & courses
  const revenueSparkline = useMemo(() => {
    if (!transactions.length) return [];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let cum = 0;
    return sorted.map((t) => { cum += t.amount; return cum; });
  }, [transactions]);

  const subscriberSeries = useMemo(
    () => courses.map((c) => c.subscriber_enrollments),
    [courses]
  );

  const activeCourseSeries = useMemo(() => {
    if (!earnings) return [];
    const steps = Math.max(courses.length, 2);
    return Array.from({ length: steps }, (_, idx) => Math.min(earnings.active_courses, idx + 1));
  }, [courses.length, earnings]);

  const avgDirectSalesSeries = useMemo(() => {
    if (!courses.length) return [];
    let runningTotal = 0;
    return courses.map((course, idx) => {
      runningTotal += course.direct_sales_revenue;
      return runningTotal / (idx + 1);
    });
  }, [courses]);

  const fetchConnectStatus = async () => {
    return paymentApi.getInstructorStripeConnectStatus();
  };

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [earningsData, coursesData, transactionsData, connectStatusData] = await Promise.all([
          paymentApi.getInstructorEarnings(),
          paymentApi.getInstructorCourseRevenue(),
          paymentApi.getInstructorTransactions(),
          fetchConnectStatus()
        ]);
        setEarnings(earningsData);
        setCourses(coursesData);
        setTransactions(transactionsData);
        setConnectStatus(connectStatusData);
      } catch {
        setError('Failed to load payment data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const refreshConnectStatus = async () => {
    setConnectBusy('refresh');
    setError(null);
    try {
      const status = await fetchConnectStatus();
      setConnectStatus(status);
    } catch {
      setError('Failed to refresh Stripe Connect status.');
    } finally {
      setConnectBusy(null);
    }
  };

  const startConnectRedirectAction = async (
    action: ConnectBusyAction,
    getUrl: () => Promise<string>,
    errorMessage: string
  ) => {
    setConnectBusy(action);
    setError(null);
    try {
      const url = await getUrl();
      window.location.assign(url);
    } catch {
      setError(errorMessage);
      setConnectBusy(null);
    }
  };

  const handleStartOnboarding = async () => {
    await startConnectRedirectAction(
      'onboard',
      async () => {
        const onboarding = await paymentApi.createInstructorStripeConnectOnboarding();
        return onboarding.url;
      },
      'Failed to start Stripe onboarding.'
    );
  };

  const handleOpenStripeDashboard = async () => {
    await startConnectRedirectAction(
      'dashboard',
      async () => {
        const dashboard = await paymentApi.createInstructorStripeConnectDashboardLink();
        return dashboard.url;
      },
      'Failed to open Stripe dashboard.'
    );
  };

  if (!user) return null;

  const canOpenDashboard = Boolean(connectStatus?.dashboard_available);
  const needsOnboarding = !connectStatus?.connected || !connectStatus?.onboarding_complete;
  const dueItemsPreview = connectStatus?.currently_due.slice(0, 5).join(', ');

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="payments" />

      <main className="flex-1 relative z-10 h-screen overflow-hidden pl-16 transition-all duration-300">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Payments
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">INSTRUCTOR EARNINGS</span>
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

          {loading ? (
            <LoadingCard message="Loading payment data..." />
          ) : (
            <>
              {/* Summary Stats — 2x2 grid with mini charts */}
              {earnings && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                  <div className="stat-card animate-fade-in-up delay-100 group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                        </svg>
                      </div>
                      <span className="txt-label">Total Direct Sales</span>
                    </div>
                    <h3 className="text-3xl font-bold text-emerald-600 mb-0 font-mono tracking-tight">
                      ${earnings.total_direct_sales.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">{earnings.currency.toUpperCase()}</p>
                    <RobinhoodChart data={revenueSparkline} tone="emerald" />
                  </div>

                  <div className="stat-card animate-fade-in-up delay-200 group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                      </div>
                      <span className="txt-label">Subscriber Enrollments</span>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600 mb-0 font-mono tracking-tight">
                      {earnings.subscriber_enrollments}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">subscription usage volume</p>
                    <RobinhoodChart data={subscriberSeries} tone="blue" />
                  </div>

                  <div className="stat-card animate-fade-in-up delay-300 group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-acid/10 rounded-xl text-lime-600 border border-acid/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                        </svg>
                      </div>
                      <span className="txt-label">Active Courses</span>
                    </div>
                    <h3 className="text-3xl font-bold text-lime-600 mb-0 font-mono tracking-tight">
                      {earnings.active_courses}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">approved</p>
                    <RobinhoodChart data={activeCourseSeries} tone="lime" />
                  </div>

                  <div className="stat-card animate-fade-in-up delay-400 group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-600 border border-violet-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                        </svg>
                      </div>
                      <span className="txt-label">Avg / Course</span>
                    </div>
                    <h3 className="text-3xl font-bold text-violet-600 mb-0 font-mono tracking-tight">
                      ${earnings.avg_direct_sales_per_course.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">{earnings.currency.toUpperCase()}</p>
                    <RobinhoodChart data={avgDirectSalesSeries} tone="violet" />
                  </div>
                </div>
              )}

              {/* Stripe Connect Payout Setup */}
              <div className="border border-zinc-200 rounded-2xl p-6 mb-8 animate-fade-in-up delay-200 bg-white shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                      </svg>
                      Stripe Payouts
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      Connect Stripe to receive instructor payouts into your bank account.
                    </p>
                    {connectBanner && (
                      <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 inline-block">
                        {connectBanner}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={refreshConnectStatus}
                      className="btn-secondary text-sm"
                      disabled={connectBusy === 'refresh'}
                    >
                      {connectBusy === 'refresh' ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                    {canOpenDashboard && (
                      <button
                        onClick={handleOpenStripeDashboard}
                        className="btn-secondary text-sm"
                        disabled={connectBusy === 'dashboard'}
                      >
                        {connectBusy === 'dashboard' ? 'Opening...' : 'Open Stripe Dashboard'}
                      </button>
                    )}
                    {needsOnboarding && (
                      <button
                        onClick={handleStartOnboarding}
                        className="btn-primary text-sm"
                        disabled={connectBusy === 'onboard'}
                      >
                        {connectBusy === 'onboard' ? 'Redirecting...' : 'Complete Onboarding'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="txt-label">Account</p>
                    <p className={`text-sm font-semibold mt-1 ${connectStatus?.connected ? 'text-emerald-700' : 'text-zinc-600'}`}>
                      {connectStatus?.connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="txt-label">Charges</p>
                    <p className={`text-sm font-semibold mt-1 ${connectStatus?.charges_enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {connectStatus?.charges_enabled ? 'Enabled' : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="txt-label">Payouts</p>
                    <p className={`text-sm font-semibold mt-1 ${connectStatus?.payouts_enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {connectStatus?.payouts_enabled ? 'Enabled' : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="txt-label">Onboarding</p>
                    <p className={`text-sm font-semibold mt-1 ${connectStatus?.onboarding_complete ? 'text-emerald-700' : 'text-zinc-600'}`}>
                      {connectStatus?.onboarding_complete ? 'Complete' : 'Incomplete'}
                    </p>
                  </div>
                </div>

                {connectStatus?.requires_information && connectStatus.currently_due.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="txt-label text-amber-700">Stripe still needs</p>
                    <p className="text-xs text-amber-800 mt-1 font-mono">
                      {dueItemsPreview}
                      {connectStatus.currently_due.length > 5 ? ', ...' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Course Revenue Table */}
              <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up delay-300 mb-8">
                <div className="p-5 border-b border-zinc-200">
                  <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                    </svg>
                    Course Revenue
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="text-left px-4 py-3 txt-label">Course</th>
                        <th className="text-right px-4 py-3 txt-label">Price</th>
                        <th className="text-right px-4 py-3 txt-label">Direct Sales</th>
                        <th className="text-right px-4 py-3 txt-label hidden md:table-cell">Subscriber Enrollments</th>
                        <th className="text-right px-4 py-3 txt-label">Direct Sales Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.course_id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-zinc-900">{course.title}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${course.price.toFixed(0)}</td>
                          <td className="px-4 py-3 text-right font-mono">{course.direct_sales_count}</td>
                          <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{course.subscriber_enrollments}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            ${course.direct_sales_revenue.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!courses.length && (
                    <p className="text-center text-zinc-500 py-8">No courses yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="glass-card p-6 rounded-2xl animate-fade-in-up delay-400">
                <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-acid rounded-full animate-pulse" />
                  Recent Transactions
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {transactions.length > 0 ? (
                    transactions.map((txn) => (
                      <div
                        key={txn.transaction_id}
                        className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors border border-zinc-200"
                      >
                        <div>
                          <p className="font-medium text-zinc-900 text-sm">{txn.course_title}</p>
                          <p className="txt-label mt-0.5">
                            {new Date(txn.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold font-mono text-emerald-600">
                            +${txn.amount.toFixed(0)}
                          </p>
                          <p className="txt-label capitalize">{txn.status}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-zinc-500 py-6">No transactions yet.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO PAYMENTS <span className="text-zinc-600 font-bold">v2.0</span></p>
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

export default InstructorPaymentsPage;
