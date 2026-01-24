import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import * as courseApi from '../services/courses';
import { uploadFile } from '../services/uploads';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

const defaultCourseForm = {
  title: '',
  description: '',
  category: '',
  price: 0,
  thumbnail_url: '',
  instructor_id: ''
};

const statusBadgeClass = (status: Course['status']) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-zinc-100 text-zinc-800';
  }
};

const InstructorCoursesPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState(defaultCourseForm);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await courseApi.getInstructorCourses();
        setCourses(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'course-thumbnails');
      setCourseForm((prev) => ({ ...prev, thumbnail_url: url }));
      setSuccess('Thumbnail uploaded successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to upload thumbnail.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCreateOrUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (user?.role === 'admin' && !courseForm.instructor_id) {
      setError('Admin must specify an Instructor ID');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const instructorId = courseForm.instructor_id ? Number(courseForm.instructor_id) : undefined;

      if (editingCourse) {
        const updatePayload: Partial<Course> = {
          title: courseForm.title,
          description: courseForm.description,
          category: courseForm.category,
          price: courseForm.price,
          thumbnail_url: courseForm.thumbnail_url || null
        };
        if (user?.role === 'admin' && instructorId) {
          updatePayload.instructor_id = instructorId;
        }
        const updated = await courseApi.updateCourse(editingCourse.id, updatePayload);
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSuccess('Course updated successfully');
        setEditingCourse(null);
      } else {
        const createPayload: Omit<Course, 'id'> = {
          title: courseForm.title,
          description: courseForm.description,
          category: courseForm.category,
          price: courseForm.price,
          thumbnail_url: courseForm.thumbnail_url || null,
          status: 'draft'
        };
        if (user?.role === 'admin' && instructorId) {
          createPayload.instructor_id = instructorId;
        }
        const created = await courseApi.createCourse(createPayload);
        setCourses((prev) => [created, ...prev]);
        setSuccess('Course created successfully');
      }
      setCourseForm(defaultCourseForm);
    } catch (err) {
      console.error(err);
      setError(editingCourse ? 'Failed to update course.' : 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      price: course.price || 0,
      thumbnail_url: course.thumbnail_url || '',
      instructor_id: course.instructor_id ? String(course.instructor_id) : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setCourseForm(defaultCourseForm);
  };

  const handleSubmitForReview = async (courseId: number) => {
    setSubmitting(courseId);
    setError(null);
    setSuccess(null);
    try {
      const updated = await courseApi.submitCourse(courseId);
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccess('Course submitted for review');
    } catch (err) {
      console.error(err);
      setError('Failed to submit course for review.');
    } finally {
      setSubmitting(null);
    }
  };

  if (!user) return null;

  const draftCount = courses.filter(c => c.status === 'draft').length;
  const pendingCount = courses.filter(c => c.status === 'pending').length;
  const approvedCount = courses.filter(c => c.status === 'approved').length;

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
          <Link to="/instructor/courses" className="nav-item active" title="My Courses">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
          </Link>
          {user.role === 'admin' && (
            <>
              <Link to="/admin/moderation" className="nav-item" title="Moderation">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </Link>
              <Link to="/admin/finance" className="nav-item" title="Finance">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </Link>
            </>
          )}
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

      {/* Main Content */}
      <main className="flex-1 relative z-10 h-screen overflow-hidden md:ml-14 transition-all duration-300">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              My Courses
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">
                {user.first_name} {user.last_name} - {user.role.toUpperCase()}
              </span>
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
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

          {loading ? (
            <LoadingCard message="Loading courses..." />
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <div className="stat-card animate-fade-in-up delay-100 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-zinc-500/10 rounded-xl text-zinc-600 border border-zinc-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                      </svg>
                    </div>
                    <span className="txt-label">Drafts</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{draftCount}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">In progress</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-200 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <span className="txt-label">Pending</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{pendingCount}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Awaiting review</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-300 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <span className="txt-label">Published</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{approvedCount}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Live courses</p>
                </div>

                <div className="stat-card animate-fade-in-up delay-400 group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="p-2.5 bg-acid/10 rounded-xl text-lime-600 border border-acid/20">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                    </div>
                    <span className="txt-label">Total</span>
                  </div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-1 font-mono tracking-tight">{courses.length}</h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">All courses</p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Course Form */}
                <div className="lg:col-span-1 animate-fade-in-up delay-200">
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-zinc-900 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-acid rounded-full" />
                      {editingCourse ? 'Edit Course' : 'Create Course'}
                    </h3>
                    <form className="space-y-4" onSubmit={handleCreateOrUpdate}>
                      <div>
                        <label className="txt-label mb-1 block">Title</label>
                        <input
                          className="input"
                          value={courseForm.title}
                          onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="txt-label mb-1 block">Category</label>
                        <input
                          className="input"
                          value={courseForm.category}
                          onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                          placeholder="e.g., Programming"
                          required
                        />
                      </div>
                      <div>
                        <label className="txt-label mb-1 block">Price ($)</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={courseForm.price}
                          onChange={(e) => setCourseForm((p) => ({ ...p, price: Number(e.target.value) }))}
                          required
                        />
                      </div>
                      {user?.role === 'admin' && (
                        <div>
                          <label className="txt-label mb-1 block">Instructor ID</label>
                          <input
                            className="input"
                            type="number"
                            min={1}
                            value={courseForm.instructor_id}
                            onChange={(e) => setCourseForm((p) => ({ ...p, instructor_id: e.target.value }))}
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label className="txt-label mb-1 block">Description</label>
                        <textarea
                          className="input min-h-[100px]"
                          value={courseForm.description}
                          onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="txt-label mb-1 block">Thumbnail</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          disabled={uploadingThumbnail}
                          className="text-sm text-zinc-600"
                        />
                        {uploadingThumbnail && <span className="text-xs text-zinc-500 mt-1 block">Uploading...</span>}
                        {courseForm.thumbnail_url && (
                          <img
                            src={courseForm.thumbnail_url}
                            alt="Preview"
                            className="mt-2 h-20 w-auto rounded border border-zinc-200"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-primary flex-1" type="submit" disabled={saving || uploadingThumbnail}>
                          {saving ? 'Saving...' : editingCourse ? 'Update' : 'Create'}
                        </button>
                        {editingCourse && (
                          <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Course List */}
                <div className="lg:col-span-2 animate-fade-in-up delay-300">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-zinc-900 font-bold flex items-center gap-3 text-lg">
                      <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                      </svg>
                      Your Courses
                    </h2>
                    <span className="txt-label">{courses.length} Total</span>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="glass-card p-0 rounded-2xl flex flex-col sm:flex-row overflow-hidden group"
                      >
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full sm:w-40 h-28 object-cover"
                          />
                        ) : (
                          <div className="w-full sm:w-40 h-28 bg-zinc-100 flex items-center justify-center">
                            <span className="txt-label">{course.category}</span>
                          </div>
                        )}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base text-zinc-900 font-bold tracking-tight">{course.title}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(course.status)}`}>
                                {course.status}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{course.description}</p>
                            <p className="text-sm font-semibold text-zinc-900 mt-2 font-mono">
                              {course.price == null || course.price === 0 ? 'Free' : `$${course.price.toFixed(0)}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              className="btn-secondary text-xs py-1.5"
                              onClick={() => handleEdit(course)}
                            >
                              Edit
                            </button>
                            {(course.status === 'draft' || course.status === 'rejected') && (
                              <button
                                className="btn-accent text-xs py-1.5"
                                onClick={() => handleSubmitForReview(course.id)}
                                disabled={submitting === course.id}
                              >
                                {submitting === course.id ? 'Submitting...' : 'Submit for Review'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!courses.length && (
                      <EmptyState
                        icon="books"
                        title="No courses yet"
                        description="Create your first course to get started"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 mb-6 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label animate-fade-in-up delay-400">
                <p>APOLLO INSTRUCTOR PORTAL <span className="text-zinc-600 font-bold">v2.0</span></p>
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

export default InstructorCoursesPage;
