import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FinancialSummary, StudentBalanceDetail, Transaction } from '../types';
import * as paymentApi from '../services/payments';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

const AdminFinancialDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [students, setStudents] = useState<StudentBalanceDetail[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'balance'>('balance');
  const [sortDesc, setSortDesc] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, studentsData, transactionsData] = await Promise.all([
          paymentApi.getFinancialSummary(),
          paymentApi.getAllStudentBalances(),
          paymentApi.getTransactions()
        ]);
        setSummary(summaryData);
        setStudents(studentsData);
        setTransactions(transactionsData);
      } catch (err) {
        console.error(err);
        setError('Failed to load financial data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const filteredStudents = students
    .filter((s) => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'paid') return s.balance <= 0;
      if (filterStatus === 'pending') return s.balance > 0 && s.total_paid === 0;
      if (filterStatus === 'partial') return s.balance > 0 && s.total_paid > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.student_last_name} ${a.student_first_name}`;
        const nameB = `${b.student_last_name} ${b.student_first_name}`;
        return sortDesc ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      }
      return sortDesc ? b.balance - a.balance : a.balance - b.balance;
    });

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Enrollments', 'Total Tuition', 'Total Paid', 'Total Refunded', 'Balance', 'Status'];
    const rows = filteredStudents.map((s) => {
      const status = s.balance <= 0 ? 'paid' : s.total_paid > 0 ? 'partial' : 'pending';
      return [
        `${s.student_first_name} ${s.student_last_name}`,
        s.student_email,
        s.enrollment_count,
        s.total_tuition.toFixed(2),
        s.total_paid.toFixed(2),
        s.total_refunded.toFixed(2),
        s.balance.toFixed(2),
        status
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-balances-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

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
        className={`sidebar-rail left-4 w-12 rounded-full py-5 gap-6 h-auto top-1/2 -translate-y-1/2 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-[150%]'} md:translate-x-0`}
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
          <Link to="/instructor/courses" className="nav-item" title="My Courses">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
          </Link>
          <Link to="/admin/moderation" className="nav-item" title="Moderation">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </Link>
          <Link to="/admin/finance" className="nav-item active" title="Finance">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
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
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Finance
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">ADMIN DASHBOARD</span>
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
            <LoadingCard message="Loading financial data..." />
          ) : (
            <>
              {/* Summary Stats */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                  <div className="stat-card animate-fade-in-up delay-100 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                        </svg>
                      </div>
                      <span className="txt-label">Total Revenue</span>
                    </div>
                    <h3 className="text-3xl font-bold text-emerald-600 mb-1 font-mono tracking-tight">
                      ${summary.total_revenue.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{summary.currency.toUpperCase()}</p>
                  </div>

                  <div className="stat-card animate-fade-in-up delay-200 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 border border-red-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                      </div>
                      <span className="txt-label">Outstanding</span>
                    </div>
                    <h3 className="text-3xl font-bold text-red-600 mb-1 font-mono tracking-tight">
                      ${summary.outstanding_balance.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{summary.students_with_balance} students</p>
                  </div>

                  <div className="stat-card animate-fade-in-up delay-300 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 border border-blue-500/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85z" />
                        </svg>
                      </div>
                      <span className="txt-label">Refunded</span>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-600 mb-1 font-mono tracking-tight">
                      ${summary.total_refunded.toFixed(0)}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">{summary.currency.toUpperCase()}</p>
                  </div>

                  <div className="stat-card animate-fade-in-up delay-400 group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="p-2.5 bg-acid/10 rounded-xl text-lime-600 border border-acid/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                      </div>
                      <span className="txt-label">Payment Status</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-emerald-600">{summary.students_paid} paid</p>
                      <p className="text-sm font-medium text-blue-600">{summary.students_partial} partial</p>
                      <p className="text-sm font-medium text-amber-600">{summary.students_pending} pending</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Balances Table */}
              <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up delay-300">
                <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                    Student Balances
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="input text-sm py-1.5 w-auto"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    >
                      <option value="all">All Students</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                    <select
                      className="input text-sm py-1.5 w-auto"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    >
                      <option value="balance">Sort by Balance</option>
                      <option value="name">Sort by Name</option>
                    </select>
                    <button
                      className="btn-secondary text-sm py-1.5 px-3"
                      onClick={() => setSortDesc(!sortDesc)}
                    >
                      {sortDesc ? 'Desc' : 'Asc'}
                    </button>
                    <button className="btn-primary text-sm py-1.5" onClick={handleExportCSV}>
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="text-left px-4 py-3 txt-label">Student</th>
                        <th className="text-left px-4 py-3 txt-label hidden sm:table-cell">Email</th>
                        <th className="text-right px-4 py-3 txt-label">Enrollments</th>
                        <th className="text-right px-4 py-3 txt-label hidden md:table-cell">Tuition</th>
                        <th className="text-right px-4 py-3 txt-label hidden md:table-cell">Paid</th>
                        <th className="text-right px-4 py-3 txt-label">Balance</th>
                        <th className="text-center px-4 py-3 txt-label">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const status = student.balance <= 0 ? 'paid' : student.total_paid > 0 ? 'partial' : 'pending';
                        const statusClass = status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800';

                        return (
                          <tr key={student.student_id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-900">
                                {student.student_first_name} {student.student_last_name}
                              </div>
                              <div className="text-zinc-500 sm:hidden text-xs">{student.student_email}</div>
                            </td>
                            <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{student.student_email}</td>
                            <td className="px-4 py-3 text-right font-mono">{student.enrollment_count}</td>
                            <td className="px-4 py-3 text-right font-mono hidden md:table-cell">${student.total_tuition.toFixed(0)}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 hidden md:table-cell">
                              ${student.total_paid.toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              <span className={student.balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                ${student.balance.toFixed(0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!filteredStudents.length && (
                    <p className="text-center text-zinc-500 py-8">No students found.</p>
                  )}
                </div>
              </div>

              {/* Transactions */}
              {transactions.length > 0 && (
                <div className="glass-card p-6 rounded-2xl mt-8 animate-fade-in-up delay-400">
                  <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-acid rounded-full animate-pulse" />
                    Recent Transactions
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {transactions.slice(0, 15).map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition-colors border border-zinc-200"
                      >
                        <div>
                          <p className="font-medium text-zinc-900 text-sm">
                            Student #{txn.student_id} - {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                          </p>
                          <p className="txt-label mt-0.5">
                            {new Date(txn.created_at).toLocaleString()}
                          </p>
                          {txn.description && (
                            <p className="text-xs text-zinc-500 mt-1">{txn.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold font-mono ${txn.type === 'payment' ? 'text-emerald-600' : txn.type === 'refund' ? 'text-blue-600' : 'text-zinc-700'}`}>
                            {txn.type === 'refund' ? '+' : '-'}${txn.amount.toFixed(0)}
                          </p>
                          <p className="txt-label capitalize">{txn.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO FINANCE CONSOLE <span className="text-zinc-600 font-bold">v2.0</span></p>
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

export default AdminFinancialDashboard;
