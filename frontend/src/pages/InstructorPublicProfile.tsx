import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InstructorProfile, Course } from '../types';
import * as profileApi from '../services/profiles';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

const InstructorPublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <LoadingCard message="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="max-w-md w-full px-4">
          <Alert type="error" message={error ?? 'Profile not found'} />
          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-zinc-900 tracking-tight">
            Apollo
          </Link>
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            Browse Courses
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-zinc-200 overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-zinc-900">
                {profile.first_name} {profile.last_name}
              </h1>
              {profile.headline && (
                <p className="text-zinc-600 mt-1">{profile.headline}</p>
              )}

              {/* Links */}
              <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start">
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                    </svg>
                    Website
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">About</h2>
            <p className="text-zinc-600 whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* Specializations */}
        {profile.specializations && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Specializations</h2>
            <p className="text-zinc-600">{profile.specializations}</p>
          </div>
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-zinc-100 flex items-center justify-center">
                      <svg className="w-10 h-10 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-zinc-900 text-sm">{course.title}</h3>
                    {course.category && (
                      <span className="text-xs text-zinc-500 mt-1 block">{course.category}</span>
                    )}
                    {course.price != null && (
                      <p className="text-sm font-medium text-zinc-700 mt-2">
                        {course.price === 0 ? 'Free' : `$${course.price}`}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorPublicProfile;
