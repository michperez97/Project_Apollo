import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Assignment, Course, Module, ModuleItemType, Submission, Announcement } from '../types';
import * as courseApi from '../services/courses';
import * as moduleApi from '../services/modules';
import * as assignmentApi from '../services/assignments';
import * as announcementApi from '../services/announcements';
import { uploadFile } from '../services/uploads';
import { api } from '../services/http';
import { LoadingCard, Spinner } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

type ItemDraft = {
  title: string;
  type: ModuleItemType;
  content_url: string;
  content_text: string;
};

const defaultItemDraft: ItemDraft = {
  title: '',
  type: 'text',
  content_url: '',
  content_text: ''
};

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const id = Number(courseId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [itemDrafts, setItemDrafts] = useState<Record<number, ItemDraft>>({});
  const [savingModule, setSavingModule] = useState(false);
  const [savingItem, setSavingItem] = useState<Record<number, boolean>>({});
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_at: '',
    points: 100,
    module_id: ''
  });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [submissionDrafts, setSubmissionDrafts] = useState<
    Record<number, { content_url: string; content_text: string }>
  >({});
  const [submissionSaving, setSubmissionSaving] = useState<Record<number, boolean>>({});
  const [submissions, setSubmissions] = useState<Record<number, Submission[]>>({});
  const [uploadingModuleFile, setUploadingModuleFile] = useState<Record<number, boolean>>({});
  const [uploadingSubmissionFile, setUploadingSubmissionFile] = useState<Record<number, boolean>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, { grade: string; feedback: string }>>({});

  const canManage = useMemo(
    () => user?.role === 'admin' || user?.role === 'teacher',
    [user]
  );

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [courseData, modulesData, assignmentsData, announcementsData] = await Promise.all([
          courseApi.getCourse(id),
          moduleApi.getModules(id),
          assignmentApi.getAssignments(id),
          announcementApi.getAnnouncements(id)
        ]);
        setCourse(courseData);
        setModules(modulesData);
        setAssignments(assignmentsData);
        setAnnouncements(announcementsData);
        if (user) {
          const subsEntries = await Promise.all(
            assignmentsData.map(async (a) => {
              const subs = await assignmentApi.getSubmissions(a.id);
              return [a.id, subs] as const;
            })
          );
          setSubmissions(Object.fromEntries(subsEntries));
        }
      } catch (err) {
        console.error(err);
        setError('Could not load course.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, user]);

  const refreshModules = async () => {
    try {
      const data = await moduleApi.getModules(id);
      setModules(data);
    } catch (err) {
      console.error(err);
      setError('Failed to refresh modules.');
    }
  };

  const refreshAssignments = async () => {
    try {
      const data = await assignmentApi.getAssignments(id);
      setAssignments(data);
      if (user) {
        const subsEntries = await Promise.all(
          data.map(async (a) => {
            const subs = await assignmentApi.getSubmissions(a.id);
            return [a.id, subs] as const;
          })
        );
        setSubmissions(Object.fromEntries(subsEntries));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to refresh assignments.');
    }
  };

  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) return;
    setSavingModule(true);
    setError(null);
    try {
      await moduleApi.createModule(id, moduleTitle.trim());
      setModuleTitle('');
      await refreshModules();
    } catch (err) {
      console.error(err);
      setError('Could not create module.');
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    try {
      await moduleApi.deleteModule(moduleId);
      await refreshModules();
    } catch (err) {
      console.error(err);
      setError('Could not delete module.');
    }
  };

  const handleCreateItem = async (moduleId: number) => {
    const draft = itemDrafts[moduleId] ?? defaultItemDraft;
    if (!draft.title.trim()) return;
    setSavingItem((prev) => ({ ...prev, [moduleId]: true }));
    setError(null);
    try {
      await moduleApi.createModuleItem(moduleId, {
        title: draft.title,
        type: draft.type,
        content_url: draft.type !== 'text' ? draft.content_url : undefined,
        content_text: draft.type === 'text' ? draft.content_text : undefined
      });
      setItemDrafts((prev) => ({ ...prev, [moduleId]: defaultItemDraft }));
      await refreshModules();
    } catch (err) {
      console.error(err);
      setError('Could not add item.');
    } finally {
      setSavingItem((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await moduleApi.deleteModuleItem(itemId);
      await refreshModules();
    } catch (err) {
      console.error(err);
      setError('Could not delete item.');
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.title.trim()) return;
    setSavingAssignment(true);
    setError(null);
    try {
      await assignmentApi.createAssignment(id, {
        title: assignmentForm.title,
        description: assignmentForm.description,
        due_at: assignmentForm.due_at || undefined,
        points: Number(assignmentForm.points) || 0,
        module_id: assignmentForm.module_id ? Number(assignmentForm.module_id) : null
      });
      setAssignmentForm({ title: '', description: '', due_at: '', points: 100, module_id: '' });
      await refreshAssignments();
    } catch (err) {
      console.error(err);
      setError('Could not create assignment.');
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      await assignmentApi.deleteAssignment(assignmentId);
      await refreshAssignments();
    } catch (err) {
      console.error(err);
      setError('Could not delete assignment.');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) return;
    setSavingAnnouncement(true);
    setError(null);
    try {
      const announcement = await announcementApi.createAnnouncement({
        course_id: id,
        title: announcementForm.title,
        message: announcementForm.message
      });
      setAnnouncements((prev) => [announcement, ...prev]);
      setAnnouncementForm({ title: '', message: '' });
    } catch (err) {
      console.error(err);
      setError('Could not create announcement.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: number) => {
    try {
      await announcementApi.deleteAnnouncement(announcementId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    } catch (err) {
      console.error(err);
      setError('Could not delete announcement.');
    }
  };

  const handleSubmitAssignment = async (assignmentId: number) => {
    const draft = submissionDrafts[assignmentId] ?? { content_url: '', content_text: '' };
    if (!draft.content_url && !draft.content_text) {
      setError('Provide submission content.');
      return;
    }
    setSubmissionSaving((prev) => ({ ...prev, [assignmentId]: true }));
    setError(null);
    try {
      const submission = await assignmentApi.submitAssignment(assignmentId, draft);
      setSubmissions((prev) => ({
        ...prev,
        [assignmentId]: [submission]
      }));
      setSubmissionDrafts((prev) => ({
        ...prev,
        [assignmentId]: { content_url: '', content_text: '' }
      }));
    } catch (err) {
      console.error(err);
      setError('Could not submit assignment.');
    } finally {
      setSubmissionSaving((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleUploadModuleFile = async (moduleId: number, file: File) => {
    setUploadingModuleFile((prev) => ({ ...prev, [moduleId]: true }));
    setError(null);
    try {
      const url = await uploadFile(file, 'module_items');
      setDraft(moduleId, { content_url: url, type: 'file' });
    } catch (err) {
      console.error(err);
      setError('File upload failed.');
    } finally {
      setUploadingModuleFile((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleUploadSubmissionFile = async (assignmentId: number, file: File) => {
    setUploadingSubmissionFile((prev) => ({ ...prev, [assignmentId]: true }));
    setError(null);
    try {
      const url = await uploadFile(file, 'submissions');
      setSubmissionDrafts((prev) => ({
        ...prev,
        [assignmentId]: { ...(prev[assignmentId] ?? { content_url: '', content_text: '' }), content_url: url }
      }));
    } catch (err) {
      console.error(err);
      setError('File upload failed.');
    } finally {
      setUploadingSubmissionFile((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleGradeSubmission = async (submissionId: number) => {
    const draft = gradeDrafts[submissionId] ?? { grade: '', feedback: '' };
    setError(null);
    try {
      const updated = await assignmentApi.gradeSubmission(submissionId, {
        grade: draft.grade === '' ? null : Number(draft.grade),
        feedback: draft.feedback
      });
      // refresh submissions map
      setSubmissions((prev) => {
        const next: Record<number, Submission[]> = {};
        Object.entries(prev).forEach(([assignmentId, subs]) => {
          next[Number(assignmentId)] = subs.map((s) => (s.id === submissionId ? updated : s));
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setError('Could not save grade.');
    }
  };

  const handleDownloadGradebook = async () => {
    try {
      const response = await api.get(`/courses/${id}/gradebook.csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook_course_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
      setError('Could not download gradebook.');
    }
  };

  const setDraft = (moduleId: number, updates: Partial<ItemDraft>) => {
    setItemDrafts((prev) => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] ?? defaultItemDraft), ...updates }
    }));
  };

  if (loading) {
    return <LoadingCard message="Loading course..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <EmptyState
          icon="❌"
          title="Course not found"
          description="The course you're looking for doesn't exist or has been removed"
          action={<Link to="/" className="btn-primary">Back to Dashboard</Link>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <p className="text-xs sm:text-sm text-gray-500 mb-1">
            <Link to="/" className="text-primary-600 hover:text-primary-700">
              Dashboard
            </Link>{' '}
            / Course
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold break-words">
            {course.code} — {course.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {course.semester} {course.year} · {course.credit_hours} credits
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {canManage && (
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Add Module</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="input flex-1"
                placeholder="Module title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
              />
              <button className="btn-primary w-full sm:w-auto" onClick={handleCreateModule} disabled={savingModule}>
                {savingModule ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Add Module'
                )}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          {!modules.length && (
            <EmptyState
              icon="📦"
              title="No modules yet"
              description={canManage ? "Add your first module to organize course content" : "No content available"}
            />
          )}
          
          {modules.map((mod) => (
            <div key={mod.id} className="card space-y-3">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold break-words">{mod.title}</h3>
                  <p className="text-sm text-gray-500">Module #{mod.position}</p>
                </div>
                {canManage && (
                  <button
                    className="text-sm text-red-600 hover:text-red-700 whitespace-nowrap w-full sm:w-auto"
                    onClick={() => handleDeleteModule(mod.id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {mod.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs uppercase text-gray-500">{item.type}</p>
                      {item.type === 'text' && item.content_text && (
                        <p className="text-sm text-gray-700 mt-1">{item.content_text}</p>
                      )}
                      {item.type !== 'text' && item.content_url && (
                        <a
                          className="text-sm text-primary-600 hover:text-primary-700"
                          href={item.content_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open link
                        </a>
                      )}
                    </div>
                    {canManage && (
                      <button
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {!mod.items.length && <p className="text-sm text-gray-500">No items yet.</p>}
              </div>

              {canManage && (
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Add item</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      className="input"
                      placeholder="Title"
                      value={(itemDrafts[mod.id] ?? defaultItemDraft).title}
                      onChange={(e) => setDraft(mod.id, { title: e.target.value })}
                    />
                    <select
                      className="input"
                      value={(itemDrafts[mod.id] ?? defaultItemDraft).type}
                      onChange={(e) => setDraft(mod.id, { type: e.target.value as ModuleItemType })}
                    >
                      <option value="text">Text</option>
                      <option value="link">Link</option>
                      <option value="file">File</option>
                    </select>
                    <input
                      className="input"
                      placeholder="Content URL (for link/file)"
                      value={(itemDrafts[mod.id] ?? defaultItemDraft).content_url}
                      onChange={(e) => setDraft(mod.id, { content_url: e.target.value })}
                    />
                    <textarea
                      className="input"
                      placeholder="Content text (for text type)"
                      value={(itemDrafts[mod.id] ?? defaultItemDraft).content_text}
                      onChange={(e) => setDraft(mod.id, { content_text: e.target.value })}
                    />
                  </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadModuleFile(mod.id, file);
                    }}
                  />
                  {uploadingModuleFile[mod.id] && (
                    <span className="text-sm text-gray-600">Uploading...</span>
                  )}
                </div>
                  <button
                    className="btn-primary"
                    onClick={() => handleCreateItem(mod.id)}
                    disabled={savingItem[mod.id]}
                  >
                    {savingItem[mod.id] ? 'Adding...' : 'Add item'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {!modules.length && <p className="text-sm text-gray-600">No modules yet.</p>}
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Assignments</h2>
              <p className="text-sm text-gray-600">Track and submit course assignments.</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={handleDownloadGradebook}
                >
                  Download CSV
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateAssignment}
                  disabled={savingAssignment}
                  type="button"
                >
                  {savingAssignment ? 'Saving...' : 'Create'}
                </button>
              </div>
            )}
          </div>

          {canManage && (
            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="Title"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Due date (optional, YYYY-MM-DD)"
                value={assignmentForm.due_at}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, due_at: e.target.value }))}
              />
              <textarea
                className="input md:col-span-2"
                placeholder="Description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div>
                <label className="block text-sm text-gray-700 mb-1">Points</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={assignmentForm.points}
                  onChange={(e) =>
                    setAssignmentForm((p) => ({ ...p, points: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Module (optional)</label>
                <select
                  className="input"
                  value={assignmentForm.module_id}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, module_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {assignments.map((assignment) => {
              const mySubmission = submissions[assignment.id]?.[0];
              return (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{assignment.title}</p>
                      {assignment.due_at && (
                        <p className="text-xs text-gray-500">
                          Due: {new Date(assignment.due_at).toLocaleString()}
                        </p>
                      )}
                      {assignment.description && (
                        <p className="text-sm text-gray-700 mt-1">{assignment.description}</p>
                      )}
                      <p className="text-xs text-gray-500">Points: {assignment.points}</p>
                    </div>
                    {canManage && (
                      <button
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {user?.role === 'student' && (
                    <div className="space-y-2">
                      {mySubmission ? (
                        <p className="text-sm text-green-700">
                          Submitted at {new Date(mySubmission.submitted_at).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">No submission yet.</p>
                      )}
                      {mySubmission?.grade !== undefined && mySubmission?.grade !== null && (
                        <p className="text-sm text-gray-700">
                          Grade: {mySubmission.grade}{' '}
                          {mySubmission.feedback && `· Feedback: ${mySubmission.feedback}`}
                        </p>
                      )}
                      <div className="grid md:grid-cols-2 gap-3">
                        <input
                          className="input"
                          placeholder="Submission URL"
                          value={
                            (submissionDrafts[assignment.id] ?? { content_url: '', content_text: '' })
                              .content_url
                          }
                          onChange={(e) =>
                            setSubmissionDrafts((p) => ({
                              ...p,
                              [assignment.id]: {
                                ...(p[assignment.id] ?? { content_url: '', content_text: '' }),
                                content_url: e.target.value
                              }
                            }))
                          }
                        />
                        <textarea
                          className="input"
                          placeholder="Submission text"
                          value={
                            (submissionDrafts[assignment.id] ?? { content_url: '', content_text: '' })
                              .content_text
                          }
                          onChange={(e) =>
                            setSubmissionDrafts((p) => ({
                              ...p,
                              [assignment.id]: {
                                ...(p[assignment.id] ?? { content_url: '', content_text: '' }),
                                content_text: e.target.value
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadSubmissionFile(assignment.id, file);
                          }}
                        />
                        {uploadingSubmissionFile[assignment.id] && (
                          <span className="text-sm text-gray-600">Uploading...</span>
                        )}
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleSubmitAssignment(assignment.id)}
                        disabled={submissionSaving[assignment.id]}
                      >
                        {submissionSaving[assignment.id] ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  )}

                  {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 font-semibold">
                        Submissions ({submissions[assignment.id]?.length ?? 0})
                      </p>
                      <div className="space-y-2">
                        {(submissions[assignment.id] ?? []).map((sub) => (
                          <div
                            key={sub.id}
                            className="border border-gray-200 rounded-md p-2 flex flex-col gap-2"
                          >
                            <div className="text-sm text-gray-700">
                              Student #{sub.student_id} ·{' '}
                              {new Date(sub.submitted_at).toLocaleString()}
                            </div>
                            {sub.content_url && (
                              <a
                                className="text-sm text-primary-600 hover:text-primary-700"
                                href={sub.content_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View file/link
                              </a>
                            )}
                            {sub.content_text && (
                              <p className="text-sm text-gray-700">{sub.content_text}</p>
                            )}
                            <div className="grid md:grid-cols-2 gap-2">
                              <input
                                className="input"
                                type="number"
                                placeholder="Grade"
                                value={(gradeDrafts[sub.id]?.grade ?? sub.grade ?? '').toString()}
                                onChange={(e) =>
                                  setGradeDrafts((p) => ({
                                    ...p,
                                    [sub.id]: {
                                      grade: e.target.value,
                                      feedback: p[sub.id]?.feedback ?? sub.feedback ?? ''
                                    }
                                  }))
                                }
                              />
                              <input
                                className="input"
                                placeholder="Feedback"
                                value={gradeDrafts[sub.id]?.feedback ?? sub.feedback ?? ''}
                                onChange={(e) =>
                                  setGradeDrafts((p) => ({
                                    ...p,
                                    [sub.id]: {
                                      grade: p[sub.id]?.grade ?? (sub.grade ?? '').toString(),
                                      feedback: e.target.value
                                    }
                                  }))
                                }
                              />
                            </div>
                            <button
                              className="btn-primary w-fit"
                              onClick={() => handleGradeSubmission(sub.id)}
                            >
                              Save grade
                            </button>
                          </div>
                        ))}
                        {!submissions[assignment.id]?.length && (
                          <p className="text-sm text-gray-600">No submissions yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!assignments.length && <p className="text-sm text-gray-600">No assignments yet.</p>}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Announcements</h2>

          {canManage && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <h3 className="font-medium">Create Announcement</h3>
              <input
                className="input"
                placeholder="Title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                className="input min-h-[100px]"
                placeholder="Message"
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm((p) => ({ ...p, message: e.target.value }))}
              />
              <button
                className="btn-primary"
                onClick={handleCreateAnnouncement}
                disabled={savingAnnouncement}
              >
                {savingAnnouncement ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Posting...
                  </>
                ) : (
                  'Post Announcement'
                )}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {canManage && (
                      <button
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
              </div>
            ))}
            {!announcements.length && (
              <EmptyState
                icon="📢"
                title="No announcements yet"
                description={canManage ? "Post your first announcement to communicate with students" : "No announcements have been posted"}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CoursePage;

