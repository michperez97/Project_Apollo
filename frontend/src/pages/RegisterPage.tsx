import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Could not create account. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-lime-200/35 blur-3xl" />
      <div className="absolute -bottom-48 left-12 h-96 w-96 rounded-full bg-amber-200/35 blur-3xl" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-6 md:px-10 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2L4 22h3.5l1.5-4h6l1.5 4H20L12 2zm0 5.5L14 15h-4l2-7.5z" />
              </svg>
            </div>
            <div>
              <p className="txt-label">Apollo</p>
              <p className="text-sm font-semibold text-zinc-700">Operator Console</p>
            </div>
          </Link>
          <Link className="btn-secondary text-sm" to="/login">
            Sign in
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="glass-card w-full max-w-lg p-8 rounded-2xl">
            <div className="mb-6">
              <p className="txt-label">Create Access</p>
              <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
              <p className="text-sm text-zinc-500 mt-1">Join Apollo and start learning immediately.</p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="txt-label mb-1 block">First name</label>
                  <input
                    className="input"
                    value={form.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="txt-label mb-1 block">Last name</label>
                  <input
                    className="input"
                    value={form.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="txt-label mb-1 block">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="txt-label mb-1 block">Password</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="txt-label mb-1 block">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create account'}
              </button>
            </form>
            <p className="text-sm text-zinc-500 mt-4">
              Already have an account?{' '}
              <Link className="text-zinc-900 font-semibold hover:text-lime-600" to="/login">
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RegisterPage;
