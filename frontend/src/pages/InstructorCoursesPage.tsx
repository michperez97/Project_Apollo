import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import * as courseApi from '../services/courses';
import { uploadFile } from '../services/uploads';
import { importScormPackage } from '../services/scorm';
import { validateImageFile, validateScormPackageFile } from '../utils/fileValidation';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';
import SideNav from '../components/SideNav';

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
  const { user } = useAuth();
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
  const [uploadingScorm, setUploadingScorm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const maxThumbnailFileSizeBytes = 8 * 1024 * 1024;
  const maxScormFileSizeBytes = 250 * 1024 * 1024;
  const scormInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;

    if (user.role !== 'instructor' && user.role !== 'admin') {
      setError('Access denied. You must be an instructor or admin.');
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await courseApi.getInstructorCourses();
        setCourses(data);
      } catch {
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

    const validationError = validateImageFile(file, maxThumbnailFileSizeBytes, 'Thumbnail');
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadingThumbnail(true);
    setError(null);
    try {
      const url = await uploadFile(file, 'course-thumbnails');
      setCourseForm((prev) => ({ ...prev, thumbnail_url: url }));
      setSuccess('Thumbnail uploaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload thumbnail.';
      setError(message);
    } finally {
      setUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const formatImportedCourseTitle = (fileName: string): string => {
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
    const cleaned = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || `Imported SCORM ${new Date().toLocaleDateString()}`;
  };

  const handleScormImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateScormPackageFile(file, maxScormFileSizeBytes);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    setUploadingScorm(true);
    setError(null);
    setSuccess(null);

    try {
      const packageUrl = await uploadFile(file, 'scorm-packages');
      const imported = await importScormPackage({
        packageUrl,
        fileName: file.name,
        title: formatImportedCourseTitle(file.name),
        description: 'Imported from SCORM package.',
        price: 0
      });
      const importedCourse = imported.course;

      setCourses((prev) => [importedCourse, ...prev]);
      setSuccess(
        `Imported "${file.name}" as SCORM course "${importedCourse.title}" with playable lesson content.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import SCORM package.';
      setError(message);
    } finally {
      setUploadingScorm(false);
      e.target.value = '';
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
      setShowModal(false);
    } catch {
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
    setShowModal(true);
  };

  const handleCancelModal = () => {
    setEditingCourse(null);
    setCourseForm(defaultCourseForm);
    setShowModal(false);
  };

  const handleSubmitForReview = async (courseId: number) => {
    setSubmitting(courseId);
    setError(null);
    setSuccess(null);
    try {
      const updated = await courseApi.submitCourse(courseId);
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccess('Course submitted for review');
    } catch {
      setError('Failed to submit course for review.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    setDeleting(courseId);
    setError(null);
    setSuccess(null);
    try {
      await courseApi.deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setSuccess('Course deleted successfully');
    } catch {
      setError('Failed to delete course.');
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingCard message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="my-courses" />

      {/* Main Content */}
      <main className="flex-1 relative z-10 h-screen overflow-hidden pl-16 transition-all duration-300">
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
            <input
              ref={scormInputRef}
              type="file"
              accept=".zip,.pif,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={handleScormImport}
            />
            <button
              className="btn-primary text-sm"
              onClick={() => { setEditingCourse(null); setCourseForm(defaultCourseForm); setShowModal(true); }}
            >
              Create Course
            </button>
            <button
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 min-h-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
              onClick={() => scormInputRef.current?.click()}
              disabled={uploadingScorm}
            >
              {uploadingScorm ? 'Importing...' : 'Import'}
            </button>
            <Link to="/dashboard" className="btn-secondary text-sm">
              Dashboard
            </Link>
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
              {/* Full-width Course List */}
              <div className="animate-fade-in-up delay-300">
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
                            {course.price == null || Number(course.price) === 0 ? 'Free' : `$${Number(course.price).toFixed(0)}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <button
                            className="btn-secondary text-xs py-1.5"
                            onClick={() => handleEdit(course)}
                          >
                            Edit
                          </button>
                          <Link
                            to={`/instructor/courses/${course.id}/builder`}
                            className="btn-secondary text-xs py-1.5"
                          >
                            Manage Content
                          </Link>
                          <Link
                            to={`/instructor/courses/${course.id}/quizzes`}
                            className="btn-secondary text-xs py-1.5"
                          >
                            Manage Quizzes
                          </Link>
                          {(course.status === 'draft' || course.status === 'rejected') && (
                            <button
                              className="btn-accent text-xs py-1.5"
                              onClick={() => handleSubmitForReview(course.id)}
                              disabled={submitting === course.id}
                            >
                              {submitting === course.id ? 'Submitting...' : 'Submit for Review'}
                            </button>
                          )}
                          <button
                            className="ml-auto px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
                            onClick={() => setConfirmDeleteId(course.id)}
                          >
                            Delete
                          </button>
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

      {/* Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
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
                  <button type="button" className="btn-secondary" onClick={handleCancelModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Delete Course</h3>
            <p className="text-sm text-zinc-600 mb-1">
              Are you sure you want to delete <strong>{courses.find(c => c.id === confirmDeleteId)?.title}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-5">
              This action cannot be undone. All sections, lessons, and associated data will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn-secondary text-sm"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting === confirmDeleteId}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={() => handleDeleteCourse(confirmDeleteId)}
                disabled={deleting === confirmDeleteId}
              >
                {deleting === confirmDeleteId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorCoursesPage;
