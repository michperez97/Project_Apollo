import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { InstructorEarningsSummary, CourseRevenueBreakdown, InstructorTransaction } from '../types';
import * as paymentApi from '../services/payments';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import SideNav from '../components/SideNav';

/* ── Pure-SVG mini charts (no library needed) ── */

const Sparkline = ({ data, color, fillColor }: { data: number[]; color: string; fillColor: string }) => {
  if (data.length < 2) return null;
  const w = 120, h = 36, pad = 2;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / range) * (h - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color})`} />
      <path d={line} fill="none" stroke={fillColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.5} fill={fillColor} />
    </svg>
  );
};

const MiniBarChart = ({ data, color }: { data: number[]; color: string }) => {
  if (!data.length) return null;
  const w = 120, h = 36, pad = 2;
  const max = Math.max(...data) || 1;
  const barCount = Math.min(data.length, 8);
  const bars = data.slice(0, barCount);
  const gap = 3;
  const barW = Math.max(4, (w - pad * 2 - gap * (barCount - 1)) / barCount);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 mt-2" preserveAspectRatio="none">
      {bars.map((v, i) => {
        const barH = Math.max(2, (v / max) * (h - pad * 2));
        return (
          <rect
            key={i}
            x={pad + i * (barW + gap)}
            y={h - pad - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={color}
            opacity={0.15 + (i / barCount) * 0.65}
          />
        );
      })}
    </svg>
  );
};

const InstructorPaymentsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState<InstructorEarningsSummary | null>(null);
  const [courses, setCourses] = useState<CourseRevenueBreakdown[]>([]);
  const [transactions, setTransactions] = useState<InstructorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive chart data from already-fetched transactions & courses
  const revenueSparkline = useMemo(() => {
    if (!transactions.length) return [];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let cum = 0;
    return sorted.map((t) => { cum += t.amount; return cum; });
  }, [transactions]);

  const enrollmentBars = useMemo(
    () => courses.map((c) => c.enrollment_count),
    [courses]
  );

  const courseRevenueBars = useMemo(
    () => courses.map((c) => c.revenue),
    [courses]
  );

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [earningsData, coursesData, transactionsData] = await Promise.all([
          paymentApi.getInstructorEarnings(),
          paymentApi.getInstructorCourseRevenue(),
          paymentApi.getInstructorTransactions()
        ]);
        setEarnings(earningsData);
        setCourses(coursesData);
        setTransactions(transactionsData);
      } catch {
        setError('Failed to load payment data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  if (!user) return null;

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
                      <span className="txt-label">Total Revenue</span>
                    </div>
                    <h3 className="text-3xl font-bold text-emerald-600 mb-0 font-mono tracking-tight">
                      ${earnings.total_revenue.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">{earnings.currency.toUpperCase()}</p>
                    <Sparkline data={revenueSparkline} color="emerald" fillColor="#10b981" />
                  </div>

                  <div className="stat-card animate-fade-in-up delay-200 group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                      </div>
                      <span className="txt-label">Enrollments</span>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600 mb-0 font-mono tracking-tight">
                      {earnings.total_enrollments}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">paid students</p>
                    <MiniBarChart data={enrollmentBars} color="#3b82f6" />
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
                    <MiniBarChart data={courseRevenueBars} color="#84cc16" />
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
                      ${earnings.avg_per_course.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">{earnings.currency.toUpperCase()}</p>
                    <Sparkline data={courseRevenueBars} color="violet" fillColor="#8b5cf6" />
                  </div>
                </div>
              )}

              {/* Bank Account Placeholder */}
              <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-6 mb-8 animate-fade-in-up delay-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                      </svg>
                      Bank Account
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      Connect your bank account to receive payouts directly.
                    </p>
                  </div>
                  <button
                    disabled
                    className="btn-primary text-sm opacity-50 cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
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
                        <th className="text-right px-4 py-3 txt-label">Enrollments</th>
                        <th className="text-right px-4 py-3 txt-label hidden md:table-cell">Paid</th>
                        <th className="text-right px-4 py-3 txt-label">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.course_id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-zinc-900">{course.title}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${course.price.toFixed(0)}</td>
                          <td className="px-4 py-3 text-right font-mono">{course.enrollment_count}</td>
                          <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{course.paid_count}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                            ${course.revenue.toFixed(0)}
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
