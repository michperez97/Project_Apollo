import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { InstructorProfile, Course } from '../types';
import * as profileApi from '../services/profiles';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import SideNav from '../components/SideNav';

const InstructorPublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await profileApi.getPublicProfile(Number(userId));
        setProfile(data.profile);
        setCourses(data.courses);
      } catch {
        setError('Profile not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingCard message="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <Alert type="error" message={error ?? 'Profile not found'} />
          <div className="text-center mt-4">
            <Link to={user ? '/profile' : '/'} className="text-sm text-zinc-500 hover:text-zinc-900 underline">
              {user ? 'Back to Profile' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {user && <SideNav activePage="profile" />}

      <main className={`flex-1 relative z-10 h-screen overflow-y-auto ${user ? 'pl-16' : ''} transition-all duration-300`}>
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Public Profile
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">
                {profile.first_name} {profile.last_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 animate-fade-in-up delay-100 pointer-events-auto">
            {user && (
              <Link to="/profile" className="btn-secondary text-sm">
                ← Edit Profile
              </Link>
            )}
            <Link to={user ? '/dashboard' : '/'} className="btn-secondary text-sm">
              {user ? 'Dashboard' : 'Home'}
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="pt-28 pb-12 px-6 md:px-10 max-w-3xl mx-auto">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-28 h-28 rounded-full bg-zinc-200 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mt-3">
              {profile.first_name} {profile.last_name}
            </h2>
            {profile.headline && (
              <p className="text-zinc-500 text-sm mt-1">{profile.headline}</p>
            )}
          </div>

          {/* Info Fields */}
          <div className="space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
                <div className="input w-full bg-zinc-50 min-h-[80px] whitespace-pre-line text-sm text-zinc-700">
                  {profile.bio}
                </div>
              </div>
            )}

            {/* Specializations */}
            {profile.specializations && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Specializations</label>
                <div className="input w-full bg-zinc-50 text-sm text-zinc-700">
                  {profile.specializations}
                </div>
              </div>
            )}

            {/* Links */}
            {(profile.website_url || profile.linkedin_url) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.website_url && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Website</label>
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="input w-full bg-zinc-50 text-sm text-blue-600 hover:underline block truncate"
                    >
                      {profile.website_url}
                    </a>
                  </div>
                )}
                {profile.linkedin_url && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn</label>
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="input w-full bg-zinc-50 text-sm text-blue-600 hover:underline block truncate"
                    >
                      {profile.linkedin_url}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Courses */}
            {courses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">Courses</label>
                <div className="space-y-2.5">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl px-4 py-3 hover:border-acid/50 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-zinc-900 font-semibold group-hover:text-lime-600 transition-colors truncate">
                          {course.title}
                        </h3>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {course.category ?? 'General'} · {course.price == null || Number(course.price) === 0 ? 'Free' : `$${course.price}`}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-zinc-300 group-hover:text-lime-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstructorPublicProfile;
