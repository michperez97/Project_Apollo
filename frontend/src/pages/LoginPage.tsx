import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
      navigate(redirectTo);
    } catch (err) {

      setError('Invalid credentials');
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
          <Link className="btn-secondary text-sm" to="/register">
            Create account
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="glass-card w-full max-w-md p-8 rounded-2xl">
            <div className="mb-6">
              <p className="txt-label">Access Panel</p>
              <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
              <p className="text-sm text-zinc-500 mt-1">Sign in to continue to Apollo.</p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="txt-label mb-1 block">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="txt-label mb-1 block">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <p className="text-sm text-zinc-500 mt-4">
              New here?{' '}
              <Link className="text-zinc-900 font-semibold hover:text-lime-600" to="/register">
                Create an account
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
