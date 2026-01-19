import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FinancialSummary, StudentBalanceDetail, Transaction } from '../types';
import * as paymentApi from '../services/payments';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold">Financial Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user.first_name} {user.last_name} · {user.role}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link className="btn-secondary flex-1 sm:flex-none text-sm sm:text-base" to="/">
                Back to Dashboard
              </Link>
              <button className="btn-secondary flex-1 sm:flex-none text-sm sm:text-base" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {loading ? (
          <LoadingCard message="Loading financial data..." />
        ) : (
          <>
            {summary && (
              <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-semibold text-green-600">
                    ${summary.total_revenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{summary.currency.toUpperCase()}</p>
                </div>

                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Outstanding Balance</p>
                  <p className="text-2xl font-semibold text-red-600">
                    ${summary.outstanding_balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.students_with_balance} students
                  </p>
                </div>

                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Total Refunded</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    ${summary.total_refunded.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{summary.currency.toUpperCase()}</p>
                </div>

                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <div className="text-sm space-y-1 mt-2">
                    <p className="text-green-600">{summary.students_paid} paid</p>
                    <p className="text-blue-600">{summary.students_partial} partial</p>
                    <p className="text-yellow-600">{summary.students_pending} pending</p>
                  </div>
                </div>
              </section>
            )}

            <section className="card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-lg font-semibold">Student Balances</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <select
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 flex-1 sm:flex-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  >
                    <option value="all">All Students</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>

                  <select
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 flex-1 sm:flex-none"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="balance">Sort by Balance</option>
                    <option value="name">Sort by Name</option>
                  </select>

                  <button
                    className="text-sm text-gray-600 hover:text-gray-800 p-2 border border-gray-300 rounded-md"
                    onClick={() => setSortDesc(!sortDesc)}
                  >
                    {sortDesc ? '↓' : '↑'}
                  </button>

                  <button className="btn-primary text-sm whitespace-nowrap" onClick={handleExportCSV}>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm">Student</th>
                      <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Email</th>
                      <th className="text-right px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm">Enrollments</th>
                      <th className="text-right px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm hidden md:table-cell">Tuition</th>
                      <th className="text-right px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm hidden md:table-cell">Paid</th>
                      <th className="text-right px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm">Balance</th>
                      <th className="text-center px-2 sm:px-3 py-2 font-medium text-gray-700 text-xs sm:text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const status =
                        student.balance <= 0 ? 'paid' : student.total_paid > 0 ? 'partial' : 'pending';
                      const statusClass =
                        status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : status === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800';

                      return (
                        <tr key={student.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                            <div className="font-medium">
                              {student.student_first_name} {student.student_last_name}
                            </div>
                            <div className="text-gray-600 sm:hidden text-[10px]">{student.student_email}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">{student.student_email}</td>
                          <td className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm">{student.enrollment_count}</td>
                          <td className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm hidden md:table-cell">${student.total_tuition.toFixed(2)}</td>
                          <td className="px-2 sm:px-3 py-2 text-right text-green-600 text-xs sm:text-sm hidden md:table-cell">
                            ${student.total_paid.toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-right font-semibold text-xs sm:text-sm">
                            <span className={student.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                              ${student.balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium ${statusClass}`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!filteredStudents.length && (
                  <p className="text-center text-gray-600 py-8 text-sm">No students found.</p>
                )}
              </div>
            </section>

            {transactions.length > 0 && (
              <section className="card">
                <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
                <div className="space-y-2 max-h-96 overflow-auto pr-1">
                  {transactions.slice(0, 20).map((txn) => (
                    <div
                      key={txn.id}
                      className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm gap-2"
                    >
                      <div>
                        <p className="font-medium">
                          Student #{txn.student_id} ·{' '}
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
          </>
        )}
      </main>
    </div>
  );
};

export default AdminFinancialDashboard;
