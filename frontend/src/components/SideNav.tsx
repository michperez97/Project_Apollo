import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SideNavProps {
  activePage: 'overview' | 'my-learning' | 'my-courses' | 'moderation' | 'finance' | 'profile';
}

const linkBase = 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200';
const linkActive = `${linkBase} bg-zinc-800 text-white border border-zinc-700`;
const linkInactive = `${linkBase} text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700`;

const SideNav = ({ activePage }: SideNavProps) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-50 group">
      {/* Collapsed circle trigger */}
      <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer group-hover:opacity-0 group-hover:scale-90 transition-all duration-300 pointer-events-auto">
        <svg className="w-[18px] h-[18px] text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </div>

      {/* Expanded sidebar panel */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-52 opacity-0 scale-95 translate-x-[-8px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-300 ease-out">
        <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] py-4 px-3 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-black border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-4 h-4 fill-acid" viewBox="0 0 24 24">
                <path d="M12 2L4 22h3.5l1.5-4h6l1.5 4H20L12 2zm0 5.5L14 15h-4l2-7.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight leading-none">Navigate</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">APOLLO v2</p>
            </div>
          </div>

          <div className="h-px bg-zinc-800 mx-1" />

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
            <Link to="/dashboard" className={activePage === 'overview' ? linkActive : linkInactive}>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
              </svg>
              <span className="text-sm font-medium">Overview</span>
            </Link>

            {user.role === 'student' && (
              <Link to="/student/dashboard" className={activePage === 'my-learning' ? linkActive : linkInactive}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
                <span className="text-sm font-medium">My Learning</span>
              </Link>
            )}

            {(user.role === 'admin' || user.role === 'instructor') && (
              <Link to="/instructor/courses" className={activePage === 'my-courses' ? linkActive : linkInactive}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                </svg>
                <span className="text-sm font-medium">My Courses</span>
              </Link>
            )}

            {user.role === 'admin' && (
              <>
                <Link to="/admin/moderation" className={activePage === 'moderation' ? linkActive : linkInactive}>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                  <span className="text-sm font-medium">Moderation</span>
                </Link>
                <Link to="/admin/finance" className={activePage === 'finance' ? linkActive : linkInactive}>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                  </svg>
                  <span className="text-sm font-medium">Finance</span>
                </Link>
              </>
            )}
          </nav>

          <div className="h-px bg-zinc-800 mx-1" />

          {/* Footer */}
          <div className="flex flex-col gap-1">
            {(user.role === 'instructor' || user.role === 'admin') && (
              <Link to="/profile" className={activePage === 'profile' ? linkActive : linkInactive}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="text-sm font-medium">My Profile</span>
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 w-full"
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
