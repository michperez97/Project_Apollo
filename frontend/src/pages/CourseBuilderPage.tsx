import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import { getCourse } from '../services/courses';
import * as builder from '../services/courseBuilder';
import { CourseSection, CourseLesson } from '../services/courseBuilder';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

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

interface SectionWithLessons extends CourseSection {
  lessons: CourseLesson[];
}

const defaultLessonForm = {
  title: '',
  lesson_type: 'video' as 'video' | 'text' | 'quiz',
  video_url: '',
  content: '',
  is_preview: false
};

const CourseBuilderPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<SectionWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [savingSection, setSavingSection] = useState(false);

  // Lesson form
  const [activeLessonSection, setActiveLessonSection] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState(defaultLessonForm);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  // Accordion
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const cid = Number(courseId);

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [courseId, user, navigate]);

  const loadData = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [courseData, sectionData] = await Promise.all([
        getCourse(cid),
        builder.listSections(cid)
      ]);
      setCourse(courseData);

      // Load lessons for each section
      const sectionsWithLessons: SectionWithLessons[] = await Promise.all(
        sectionData.map(async (sec) => {
          const lessons = await builder.listLessons(cid, sec.id);
          return { ...sec, lessons };
        })
      );
      setSections(sectionsWithLessons);
      // Auto-expand all sections
      setExpandedSections(new Set(sectionData.map(s => s.id)));
    } catch {
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Section CRUD ───────────────────────────────────────────────

  const handleCreateSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;
    setSavingSection(true);
    setError(null);
    try {
      const section = await builder.createSection(cid, { title: sectionTitle.trim() });
      setSections(prev => [...prev, { ...section, lessons: [] }]);
      setExpandedSections(prev => new Set(prev).add(section.id));
      setSectionTitle('');
      setShowSectionForm(false);
      setSuccess('Section created');
    } catch {
      setError('Failed to create section');
    } finally {
      setSavingSection(false);
    }
  };

  const handleUpdateSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSectionId || !sectionTitle.trim()) return;
    setSavingSection(true);
    setError(null);
    try {
      const updated = await builder.updateSection(cid, editingSectionId, { title: sectionTitle.trim() });
      setSections(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setSectionTitle('');
      setEditingSectionId(null);
      setSuccess('Section updated');
    } catch {
      setError('Failed to update section');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm('Delete this section and all its lessons?')) return;
    try {
      await builder.deleteSection(cid, sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setSuccess('Section deleted');
    } catch {
      setError('Failed to delete section');
    }
  };

  const handleMoveSection = async (sectionId: number, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === sectionId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sections.length - 1)) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...sections];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    setSections(newOrder.map((s, i) => ({ ...s, position: i })));
    try {
      await builder.reorderSections(cid, newOrder.map(s => s.id));
    } catch {
      setError('Failed to reorder sections');
      await loadData();
    }
  };

  const startEditSection = (section: SectionWithLessons) => {
    setEditingSectionId(section.id);
    setSectionTitle(section.title);
    setShowSectionForm(false);
  };

  const cancelEditSection = () => {
    setEditingSectionId(null);
    setSectionTitle('');
  };

  // ─── Lesson CRUD ────────────────────────────────────────────────

  const handleCreateLesson = async (e: FormEvent, sectionId: number) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return;
    setSavingLesson(true);
    setError(null);
    try {
      const payload: Parameters<typeof builder.createLesson>[2] = {
        title: lessonForm.title.trim(),
        lesson_type: lessonForm.lesson_type,
        is_preview: lessonForm.is_preview
      };
      if (lessonForm.lesson_type === 'video' && lessonForm.video_url) {
        payload.video_url = lessonForm.video_url;
      }
      if (lessonForm.lesson_type === 'text' && lessonForm.content) {
        payload.content = lessonForm.content;
      }

      const lesson = await builder.createLesson(cid, sectionId, payload);
      setSections(prev => prev.map(s =>
        s.id === sectionId ? { ...s, lessons: [...s.lessons, lesson] } : s
      ));
      setLessonForm(defaultLessonForm);
      setActiveLessonSection(null);
      setSuccess('Lesson created');
    } catch {
      setError('Failed to create lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleUpdateLesson = async (e: FormEvent, sectionId: number) => {
    e.preventDefault();
    if (!editingLessonId || !lessonForm.title.trim()) return;
    setSavingLesson(true);
    setError(null);
    try {
      const payload: Parameters<typeof builder.updateLesson>[3] = {
        title: lessonForm.title.trim(),
        lesson_type: lessonForm.lesson_type,
        is_preview: lessonForm.is_preview,
        video_url: lessonForm.lesson_type === 'video' ? (lessonForm.video_url || null) : null,
        content: lessonForm.lesson_type === 'text' ? (lessonForm.content || null) : null
      };

      const updated = await builder.updateLesson(cid, sectionId, editingLessonId, payload);
      setSections(prev => prev.map(s =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.map(l => l.id === updated.id ? updated : l) }
          : s
      ));
      setLessonForm(defaultLessonForm);
      setEditingLessonId(null);
      setActiveLessonSection(null);
      setSuccess('Lesson updated');
    } catch {
      setError('Failed to update lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (sectionId: number, lessonId: number) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await builder.deleteLesson(cid, sectionId, lessonId);
      setSections(prev => prev.map(s =>
        s.id === sectionId ? { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) } : s
      ));
      setSuccess('Lesson deleted');
    } catch {
      setError('Failed to delete lesson');
    }
  };

  const handleMoveLesson = async (sectionId: number, lessonId: number, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const idx = section.lessons.findIndex(l => l.id === lessonId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === section.lessons.length - 1)) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newLessons = [...section.lessons];
    [newLessons[idx], newLessons[swapIdx]] = [newLessons[swapIdx], newLessons[idx]];

    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, lessons: newLessons.map((l, i) => ({ ...l, position: i })) } : s
    ));
    try {
      await builder.reorderLessons(cid, sectionId, newLessons.map(l => l.id));
    } catch {
      setError('Failed to reorder lessons');
      await loadData();
    }
  };

  const startEditLesson = (sectionId: number, lesson: CourseLesson) => {
    setActiveLessonSection(sectionId);
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      lesson_type: lesson.lesson_type,
      video_url: lesson.video_url || '',
      content: lesson.content || '',
      is_preview: lesson.is_preview
    });
  };

  const cancelLessonForm = () => {
    setActiveLessonSection(null);
    setEditingLessonId(null);
    setLessonForm(defaultLessonForm);
  };

  const lessonTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'Text';
      case 'quiz': return 'Quiz';
      default: return type;
    }
  };

  if (loading) return <LoadingCard />;

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              to="/instructor/courses"
              className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Courses
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
              {course?.title || 'Course Builder'}
              {course?.status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(course.status)}`}>
                  {course.status}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/instructor/courses/${courseId}/quizzes`}
              className="btn-secondary text-sm"
            >
              Quiz Builder
            </Link>
            {!showSectionForm && !editingSectionId && (
              <button
                onClick={() => { setShowSectionForm(true); setSectionTitle(''); }}
                className="btn-primary text-sm"
              >
                Add Section
              </button>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Add Section Form */}
        {showSectionForm && (
          <div className="panel-technical p-6 mb-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-3">New Section</h2>
            <form onSubmit={handleCreateSection} className="flex gap-3">
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Section title"
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                required
                autoFocus
              />
              <button type="submit" disabled={savingSection} className="btn-primary">
                {savingSection ? 'Saving...' : 'Create'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowSectionForm(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Sections List */}
        {sections.length === 0 && !showSectionForm ? (
          <div className="panel-technical p-8 text-center">
            <p className="text-zinc-500 mb-4">No sections yet. Add your first section to start building course content.</p>
            <button
              onClick={() => { setShowSectionForm(true); setSectionTitle(''); }}
              className="btn-primary"
            >
              Add First Section
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, sIdx) => (
              <div key={section.id} className="panel-technical rounded-xl overflow-hidden">
                {/* Section Header */}
                <div
                  className="flex items-center justify-between p-4 bg-zinc-50 cursor-pointer hover:bg-zinc-100 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.has(section.id) ? 'rotate-90' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {editingSectionId === section.id ? (
                      <form
                        onSubmit={handleUpdateSection}
                        className="flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={sectionTitle}
                          onChange={(e) => setSectionTitle(e.target.value)}
                          className="px-3 py-1 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          required
                          autoFocus
                        />
                        <button type="submit" disabled={savingSection} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                          Save
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); cancelEditSection(); }} className="text-sm text-zinc-500 hover:text-zinc-700">
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span className="font-bold text-zinc-900">{section.title}</span>
                    )}
                    <span className="txt-label">{section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleMoveSection(section.id, 'up')}
                      disabled={sIdx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveSection(section.id, 'down')}
                      disabled={sIdx === sections.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEditSection(section)}
                      className="p-1 text-zinc-400 hover:text-zinc-700"
                      title="Edit section"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Delete section"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Lessons (expanded) */}
                {expandedSections.has(section.id) && (
                  <div className="p-4 border-t border-zinc-200">
                    {section.lessons.length === 0 && activeLessonSection !== section.id && (
                      <p className="text-sm text-zinc-400 mb-3">No lessons in this section yet.</p>
                    )}

                    {section.lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 group/lesson">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-mono text-zinc-500">
                            {lIdx + 1}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-zinc-900">{lesson.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                {lessonTypeLabel(lesson.lesson_type)}
                              </span>
                              {lesson.is_preview && (
                                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">
                                  Preview
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveLesson(section.id, lesson.id, 'up')}
                            disabled={lIdx === 0}
                            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                            title="Move up"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveLesson(section.id, lesson.id, 'down')}
                            disabled={lIdx === section.lessons.length - 1}
                            className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                            title="Move down"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => startEditLesson(section.id, lesson)}
                            className="p-1 text-zinc-400 hover:text-zinc-700"
                            title="Edit lesson"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(section.id, lesson.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete lesson"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Lesson Form */}
                    {activeLessonSection === section.id ? (
                      <div className="mt-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                        <h4 className="text-sm font-bold text-zinc-900 mb-3">
                          {editingLessonId ? 'Edit Lesson' : 'Add Lesson'}
                        </h4>
                        <form
                          onSubmit={(e) => editingLessonId
                            ? handleUpdateLesson(e, section.id)
                            : handleCreateLesson(e, section.id)
                          }
                          className="space-y-3"
                        >
                          <div>
                            <label className="block txt-label mb-1">TITLE</label>
                            <input
                              type="text"
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm(f => ({ ...f, title: e.target.value }))}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              required
                              autoFocus
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block txt-label mb-1">TYPE</label>
                              <select
                                value={lessonForm.lesson_type}
                                onChange={(e) => setLessonForm(f => ({ ...f, lesson_type: e.target.value as 'video' | 'text' | 'quiz' }))}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              >
                                <option value="video">Video</option>
                                <option value="text">Text</option>
                                <option value="quiz">Quiz</option>
                              </select>
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={lessonForm.is_preview}
                                  onChange={(e) => setLessonForm(f => ({ ...f, is_preview: e.target.checked }))}
                                  className="w-4 h-4"
                                />
                                Free Preview
                              </label>
                            </div>
                          </div>
                          {lessonForm.lesson_type === 'video' && (
                            <div>
                              <label className="block txt-label mb-1">VIDEO URL</label>
                              <input
                                type="url"
                                value={lessonForm.video_url}
                                onChange={(e) => setLessonForm(f => ({ ...f, video_url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              />
                            </div>
                          )}
                          {lessonForm.lesson_type === 'text' && (
                            <div>
                              <label className="block txt-label mb-1">CONTENT</label>
                              <textarea
                                value={lessonForm.content}
                                onChange={(e) => setLessonForm(f => ({ ...f, content: e.target.value }))}
                                rows={4}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button type="submit" disabled={savingLesson} className="btn-primary text-sm">
                              {savingLesson ? 'Saving...' : editingLessonId ? 'Update Lesson' : 'Add Lesson'}
                            </button>
                            <button type="button" className="btn-secondary text-sm" onClick={cancelLessonForm}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActiveLessonSection(section.id); setEditingLessonId(null); setLessonForm(defaultLessonForm); }}
                        className="mt-2 text-sm text-zinc-500 hover:text-zinc-900 underline"
                      >
                        + Add Lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseBuilderPage;
