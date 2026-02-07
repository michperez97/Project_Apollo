import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { InstructorProfile } from '../types';
import * as profileApi from '../services/profiles';
import { uploadFile } from '../services/uploads';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';
import SideNav from '../components/SideNav';

const ProfilePage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const maxAvatarFileSizeBytes = 5 * 1024 * 1024;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await profileApi.getMyProfile();
        setProfile(data);
        setHeadline(data.headline ?? '');
        setBio(data.bio ?? '');
        setSpecializations(data.specializations ?? '');
        setWebsiteUrl(data.website_url ?? '');
        setLinkedinUrl(data.linkedin_url ?? '');
        setAvatarUrl(data.avatar_url ?? '');
      } catch {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > maxAvatarFileSizeBytes) {
      setError('Image is too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'profile-avatars');
      setAvatarUrl(url);
      await profileApi.updateMyProfile({ avatar_url: url });
      setSuccess('Avatar updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload avatar.';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await profileApi.updateMyProfile({
        avatar_url: avatarUrl || null,
        headline: headline || null,
        bio: bio || null,
        specializations: specializations || null,
        website_url: websiteUrl || null,
        linkedin_url: linkedinUrl || null
      });
      setProfile(updated);
      setSuccess('Profile saved successfully');
    } catch {
      setError('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingCard message="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="profile" />

      <main className="flex-1 relative z-10 h-screen overflow-y-auto pl-16 transition-all duration-300">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              My Profile
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">
                {user?.first_name} {user?.last_name} - {user?.role.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 animate-fade-in-up delay-100 pointer-events-auto">
            {user && (
              <Link to={`/instructor/${user.id}`} className="btn-secondary text-sm">
                View Public Profile
              </Link>
            )}
            <Link to="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="pt-28 pb-12 px-6 md:px-10 max-w-3xl mx-auto">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-6" />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-6" />}

          {/* Avatar */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="relative w-28 h-28 rounded-full bg-zinc-200 overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-xs text-zinc-400 mt-2">Click to upload photo</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Read-only fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={profile?.first_name ?? user?.first_name ?? ''}
                  disabled
                  className="input w-full bg-zinc-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profile?.last_name ?? user?.last_name ?? ''}
                  disabled
                  className="input w-full bg-zinc-100 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input
                type="email"
                value={profile?.email ?? user?.email ?? ''}
                disabled
                className="input w-full bg-zinc-100 cursor-not-allowed"
              />
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Data Scientist"
                maxLength={200}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell students about yourself..."
                rows={5}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Specializations</label>
              <input
                type="text"
                value={specializations}
                onChange={(e) => setSpecializations(e.target.value)}
                placeholder="e.g. Machine Learning, Python, Data Visualization"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="input w-full"
                />
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
