import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion as deleteQuestionService,
  Quiz,
  QuizQuestion
} from '../services/quizzes';
import { LoadingCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

interface QuizMetadataForm {
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes: number | null;
}

interface EditableAnswer {
  answer_text: string;
  is_correct: boolean;
  position: number;
}

interface EditableQuestion {
  _clientId: string;
  id: number | null;
  _deleted: boolean;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  answers: EditableAnswer[];
}

const InstructorQuizDetail = () => {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [metadataForm, setMetadataForm] = useState<QuizMetadataForm>({
    title: '',
    description: '',
    passing_score: 70,
    time_limit_minutes: 30
  });
  const [editableQuestions, setEditableQuestions] = useState<EditableQuestion[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const shouldStartEditing = (location.state as any)?.editing === true;

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }
    loadQuiz(shouldStartEditing);
  }, [quizId, user, navigate]);

  const loadQuiz = async (autoEdit = false) => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuiz(Number(quizId));
      setQuiz(data.quiz);
      setQuestions(data.questions);
      if (autoEdit && data.quiz) {
        setMetadataForm({
          title: data.quiz.title,
          description: data.quiz.description || '',
          passing_score: data.quiz.passing_score,
          time_limit_minutes: data.quiz.time_limit_minutes
        });
        const mapped = data.questions.map((q: QuizQuestion) => ({
          _clientId: String(q.id),
          id: q.id,
          _deleted: false,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          answers: q.answers.map((a: any) => ({
            answer_text: a.answer_text,
            is_correct: a.is_correct || false,
            position: a.position
          }))
        }));
        setEditableQuestions(mapped);
        setExpandedQuestions(new Set(mapped.map((q: EditableQuestion) => q._clientId)));
        setEditing(true);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const enterEditMode = () => {
    if (!quiz) return;
    setMetadataForm({
      title: quiz.title,
      description: quiz.description || '',
      passing_score: quiz.passing_score,
      time_limit_minutes: quiz.time_limit_minutes
    });
    const mapped = questions.map((q) => ({
      _clientId: String(q.id),
      id: q.id,
      _deleted: false,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      answers: q.answers.map((a) => ({
        answer_text: a.answer_text,
        is_correct: a.is_correct || false,
        position: a.position
      }))
    }));
    setEditableQuestions(mapped);
    setExpandedQuestions(new Set(mapped.map((q) => q._clientId)));
    setEditing(true);
    setPreviewing(false);
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  // --- Accordion ---
  const toggleQuestion = (clientId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const collapseAll = () => setExpandedQuestions(new Set());
  const expandAll = () => {
    const visible = editableQuestions.filter((q) => !q._deleted);
    setExpandedQuestions(new Set(visible.map((q) => q._clientId)));
  };

  // --- Reordering ---
  const moveQuestionUp = (visibleIdx: number) => {
    if (visibleIdx <= 0) return;
    setEditableQuestions((prev) => {
      const visible = prev.filter((q) => !q._deleted);
      if (visibleIdx >= visible.length) return prev;
      const currentId = visible[visibleIdx]._clientId;
      const prevId = visible[visibleIdx - 1]._clientId;
      const arr = [...prev];
      const ci = arr.findIndex((q) => q._clientId === currentId);
      const pi = arr.findIndex((q) => q._clientId === prevId);
      [arr[ci], arr[pi]] = [arr[pi], arr[ci]];
      return arr;
    });
  };

  const moveQuestionDown = (visibleIdx: number) => {
    setEditableQuestions((prev) => {
      const visible = prev.filter((q) => !q._deleted);
      if (visibleIdx >= visible.length - 1) return prev;
      const currentId = visible[visibleIdx]._clientId;
      const nextId = visible[visibleIdx + 1]._clientId;
      const arr = [...prev];
      const ci = arr.findIndex((q) => q._clientId === currentId);
      const ni = arr.findIndex((q) => q._clientId === nextId);
      [arr[ci], arr[ni]] = [arr[ni], arr[ci]];
      return arr;
    });
  };

  // --- Add / Delete / Duplicate ---
  const addNewQuestion = () => {
    const newId = crypto.randomUUID();
    setEditableQuestions([
      ...editableQuestions,
      {
        _clientId: newId,
        id: null,
        _deleted: false,
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        answers: [
          { answer_text: '', is_correct: false, position: 1 },
          { answer_text: '', is_correct: false, position: 2 }
        ]
      }
    ]);
    setExpandedQuestions((prev) => new Set([...prev, newId]));
  };

  const duplicateQuestion = (clientId: string) => {
    const newId = crypto.randomUUID();
    setEditableQuestions((prev) => {
      const source = prev.find((q) => q._clientId === clientId);
      if (!source) return prev;
      const sourceIdx = prev.indexOf(source);
      const duplicate: EditableQuestion = {
        ...source,
        _clientId: newId,
        id: null,
        question_text: source.question_text ? `${source.question_text} (copy)` : '',
        answers: source.answers.map((a) => ({ ...a }))
      };
      const arr = [...prev];
      arr.splice(sourceIdx + 1, 0, duplicate);
      return arr;
    });
    setExpandedQuestions((prev) => new Set([...prev, newId]));
  };

  const markQuestionDeleted = (clientId: string) => {
    setEditableQuestions((prev) =>
      prev
        .map((q) => {
          if (q._clientId !== clientId) return q;
          if (q.id === null) return null;
          return { ...q, _deleted: true };
        })
        .filter(Boolean) as EditableQuestion[]
    );
  };

  // --- Question editing ---
  const updateEditableQuestion = (
    clientId: string,
    patch: Partial<Pick<EditableQuestion, 'question_text' | 'points'>>
  ) => {
    setEditableQuestions((prev) =>
      prev.map((q) => (q._clientId === clientId ? { ...q, ...patch } : q))
    );
  };

  const handleQuestionTypeChange = (
    clientId: string,
    newType: 'multiple_choice' | 'true_false'
  ) => {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q._clientId !== clientId) return q;
        if (newType === 'true_false') {
          return {
            ...q,
            question_type: newType,
            answers: [
              { answer_text: 'True', is_correct: false, position: 1 },
              { answer_text: 'False', is_correct: false, position: 2 }
            ]
          };
        }
        // Switching to multiple_choice — keep current answers if coming from true_false
        return { ...q, question_type: newType };
      })
    );
  };

  // --- Answer editing ---
  const selectCorrectAnswer = (clientId: string, answerIndex: number) => {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q._clientId !== clientId) return q;
        return {
          ...q,
          answers: q.answers.map((a, i) => ({
            ...a,
            is_correct: i === answerIndex
          }))
        };
      })
    );
  };

  const updateAnswerText = (clientId: string, answerIndex: number, value: string) => {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q._clientId !== clientId) return q;
        const newAnswers = [...q.answers];
        newAnswers[answerIndex] = { ...newAnswers[answerIndex], answer_text: value };
        return { ...q, answers: newAnswers };
      })
    );
  };

  const addAnswerToQuestion = (clientId: string) => {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q._clientId !== clientId) return q;
        return {
          ...q,
          answers: [
            ...q.answers,
            { answer_text: '', is_correct: false, position: q.answers.length + 1 }
          ]
        };
      })
    );
  };

  const removeAnswerFromQuestion = (clientId: string, idx: number) => {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q._clientId !== clientId) return q;
        if (q.answers.length <= 2) return q;
        return { ...q, answers: q.answers.filter((_, i) => i !== idx) };
      })
    );
  };

  // --- Save ---
  const handleSaveAll = async () => {
    if (!quiz || !quizId) return;
    const qId = Number(quizId);

    const visibleQs = editableQuestions.filter((q) => !q._deleted);
    for (const q of visibleQs) {
      if (!q.question_text.trim()) {
        setError('All questions must have text');
        return;
      }
      const validAnswers = q.answers.filter((a) => a.answer_text.trim());
      if (validAnswers.length < 2) {
        setError(`Question "${q.question_text.substring(0, 40)}..." needs at least 2 answers`);
        return;
      }
      if (!validAnswers.some((a) => a.is_correct)) {
        setError(
          `Question "${q.question_text.substring(0, 40)}..." needs at least 1 correct answer`
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const metadataChanged =
        metadataForm.title !== quiz.title ||
        metadataForm.description !== (quiz.description || '') ||
        metadataForm.passing_score !== quiz.passing_score ||
        metadataForm.time_limit_minutes !== quiz.time_limit_minutes;

      if (metadataChanged) {
        await updateQuiz(qId, metadataForm);
      }

      for (const q of editableQuestions) {
        if (q._deleted && q.id !== null) {
          await deleteQuestionService(qId, q.id);
        }
      }

      for (const q of editableQuestions) {
        if (q.id !== null && !q._deleted) {
          const validAnswers = q.answers.filter((a) => a.answer_text.trim());
          await updateQuestion(qId, q.id, {
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            answers: validAnswers
          });
        }
      }

      for (const q of editableQuestions) {
        if (q.id === null && !q._deleted) {
          const validAnswers = q.answers.filter((a) => a.answer_text.trim());
          await addQuestion(qId, {
            question_text: q.question_text,
            question_type: q.question_type,
            position: 0,
            points: q.points,
            answers: validAnswers
          });
        }
      }

      await loadQuiz();
      setEditing(false);
      setSuccess('All changes saved successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingCard />;

  if (!quiz) {
    return (
      <div className="min-h-screen bg-stone-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert type="error" message="Quiz not found" />
          <Link
            to={`/instructor/courses/${courseId}/quizzes`}
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mt-4"
          >
            Back to Quiz Builder
          </Link>
        </div>
      </div>
    );
  }

  const visibleQuestions = editing
    ? editableQuestions.filter((q) => !q._deleted)
    : questions;

  // Live stats for editing
  const totalPoints = editing
    ? (visibleQuestions as EditableQuestion[]).reduce((sum, q) => sum + q.points, 0)
    : (visibleQuestions as QuizQuestion[]).reduce((sum, q) => sum + q.points, 0);

  // --- Preview Mode ---
  if (previewing) {
    return (
      <div className="min-h-screen bg-stone-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="txt-label text-amber-600 mb-1 block">STUDENT PREVIEW</span>
              <h1 className="text-2xl font-bold text-zinc-900">{quiz.title}</h1>
            </div>
            <button onClick={() => setPreviewing(false)} className="btn-secondary px-6">
              Exit Preview
            </button>
          </div>

          {quiz.description && (
            <p className="text-zinc-600 mb-4">{quiz.description}</p>
          )}

          <div className="flex gap-4 mb-6">
            {quiz.time_limit_minutes && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {quiz.time_limit_minutes} minutes
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-zinc-500">
              Passing: {quiz.passing_score}%
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, qIdx) => (
              <div key={question.id} className="panel-technical p-6">
                <p className="font-medium text-zinc-900 mb-4">
                  <span className="text-zinc-400 mr-2">{qIdx + 1}.</span>
                  {question.question_text}
                </p>
                <div className="space-y-2 ml-6">
                  {question.answers.map((answer) => (
                    <label
                      key={answer.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={`preview-q-${question.id}`}
                        disabled
                        className="w-4 h-4 text-zinc-900"
                      />
                      <span className="text-zinc-700">{answer.answer_text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled className="btn-primary opacity-50 cursor-not-allowed">
              Submit Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2 text-sm">
          <Link
            to="/instructor/courses"
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Courses
          </Link>
          <span className="text-zinc-300">/</span>
          <Link
            to={`/instructor/courses/${courseId}/builder`}
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Builder
          </Link>
          <span className="text-zinc-300">/</span>
          <Link
            to={`/instructor/courses/${courseId}/quizzes`}
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Quiz Builder
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-900 font-medium">{quiz.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">
            {editing ? 'Editing Quiz' : quiz.title}
          </h1>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="btn-secondary px-6"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setPreviewing(true)}
                  className="btn-secondary px-6"
                  disabled={questions.length === 0}
                  title={questions.length === 0 ? 'Add questions before previewing' : 'Preview as student'}
                >
                  Preview
                </button>
                <button onClick={enterEditMode} className="btn-primary">
                  Edit Quiz
                </button>
              </>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Metadata Card */}
        <div className="panel-technical p-6 mb-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block txt-label mb-2">QUIZ TITLE</label>
                <input
                  type="text"
                  value={metadataForm.title}
                  onChange={(e) =>
                    setMetadataForm({ ...metadataForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block txt-label mb-2">DESCRIPTION</label>
                <textarea
                  value={metadataForm.description}
                  onChange={(e) =>
                    setMetadataForm({ ...metadataForm, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block txt-label mb-2">PASSING SCORE (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={metadataForm.passing_score}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        passing_score: Number(e.target.value)
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    required
                  />
                </div>
                <div>
                  <label className="block txt-label mb-2">TIME LIMIT (MINUTES)</label>
                  <input
                    type="number"
                    min="1"
                    value={metadataForm.time_limit_minutes || ''}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        time_limit_minutes: Number(e.target.value) || null
                      })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-zinc-900 mb-2">Quiz Details</h2>
              {quiz.description && (
                <p className="text-zinc-600 mb-4">{quiz.description}</p>
              )}
              <div className="flex gap-6">
                <div>
                  <span className="txt-label">PASSING SCORE</span>
                  <p className="text-zinc-900 font-medium">{quiz.passing_score}%</p>
                </div>
                <div>
                  <span className="txt-label">TIME LIMIT</span>
                  <p className="text-zinc-900 font-medium">
                    {quiz.time_limit_minutes
                      ? `${quiz.time_limit_minutes} minutes`
                      : 'Unlimited'}
                  </p>
                </div>
                <div>
                  <span className="txt-label">QUESTIONS</span>
                  <p className="text-zinc-900 font-medium">{questions.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {/* Questions header with stats */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900">
              Questions {!editing && `(${questions.length})`}
            </h2>
            {editing && visibleQuestions.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span className="font-medium text-zinc-700">{visibleQuestions.length}</span> question{visibleQuestions.length !== 1 ? 's' : ''}
                  <span className="text-zinc-300">|</span>
                  <span className="font-medium text-zinc-700">{totalPoints}</span> total point{totalPoints !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={expandAll}
                    className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
                    title="Expand all"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
                    title="Collapse all"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {visibleQuestions.length === 0 && (
            editing ? (
              <EmptyState
                icon=""
                title="No questions yet"
                description="Add your first question to start building this quiz."
                action={
                  <button onClick={addNewQuestion} className="btn-primary">
                    Add First Question
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon=""
                title="No questions added yet"
                description="Click Edit Quiz to start adding questions."
              />
            )
          )}

          {editing
            ? /* Edit mode questions */
              (visibleQuestions as EditableQuestion[]).map((q, qIdx) => {
                const isExpanded = expandedQuestions.has(q._clientId);
                return (
                  <div key={q._clientId} className="panel-technical overflow-hidden">
                    {/* Collapsible header */}
                    <div
                      onClick={() => toggleQuestion(q._clientId)}
                      className="flex items-center justify-between px-6 py-4 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        {/* Chevron */}
                        <svg
                          className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-bold text-zinc-500">
                          Q{qIdx + 1}
                        </span>
                        <span className="text-sm text-zinc-700 truncate max-w-md">
                          {q.question_text || '(untitled question)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Move up */}
                        <button
                          onClick={() => moveQuestionUp(qIdx)}
                          disabled={qIdx === 0}
                          className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        {/* Move down */}
                        <button
                          onClick={() => moveQuestionDown(qIdx)}
                          disabled={qIdx === visibleQuestions.length - 1}
                          className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <span className="text-zinc-200 mx-1">|</span>
                        {/* Duplicate */}
                        <button
                          onClick={() => duplicateQuestion(q._clientId)}
                          className="text-xs text-zinc-500 hover:text-zinc-900"
                          title="Duplicate question"
                        >
                          Duplicate
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => markQuestionDeleted(q._clientId)}
                          className="text-xs text-red-600 hover:text-red-800"
                          title="Remove question"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Collapsible body */}
                    {isExpanded && (
                      <div className="p-6 space-y-4 border-t border-zinc-200">
                        <div>
                          <label className="block txt-label mb-2">QUESTION TEXT</label>
                          <textarea
                            value={q.question_text}
                            onChange={(e) =>
                              updateEditableQuestion(q._clientId, {
                                question_text: e.target.value
                              })
                            }
                            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            rows={2}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block txt-label mb-2">TYPE</label>
                            <select
                              value={q.question_type}
                              onChange={(e) =>
                                handleQuestionTypeChange(
                                  q._clientId,
                                  e.target.value as 'multiple_choice' | 'true_false'
                                )
                              }
                              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="true_false">True/False</option>
                            </select>
                          </div>
                          <div>
                            <label className="block txt-label mb-2">POINTS</label>
                            <input
                              type="number"
                              min="1"
                              value={q.points}
                              onChange={(e) =>
                                updateEditableQuestion(q._clientId, {
                                  points: Number(e.target.value)
                                })
                              }
                              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block txt-label mb-2">
                            ANSWERS
                            <span className="ml-2 text-zinc-400 font-normal normal-case">
                              (select the correct answer)
                            </span>
                          </label>
                          {q.answers.map((answer, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-3 mb-3">
                              <input
                                type="radio"
                                name={`correct-${q._clientId}`}
                                checked={answer.is_correct}
                                onChange={() => selectCorrectAnswer(q._clientId, aIdx)}
                                className="w-5 h-5 text-zinc-900 cursor-pointer"
                                title="Mark as correct answer"
                              />
                              <input
                                type="text"
                                value={answer.answer_text}
                                onChange={(e) =>
                                  updateAnswerText(q._clientId, aIdx, e.target.value)
                                }
                                placeholder={`Answer ${aIdx + 1}`}
                                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                disabled={q.question_type === 'true_false'}
                              />
                              {q.question_type === 'multiple_choice' && q.answers.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeAnswerFromQuestion(q._clientId, aIdx)
                                  }
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {q.question_type === 'multiple_choice' && (
                            <button
                              type="button"
                              onClick={() => addAnswerToQuestion(q._clientId)}
                              className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                            >
                              + Add Answer Option
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            : /* View mode questions */
              (visibleQuestions as QuizQuestion[]).map((question, qIdx) => (
                <div key={question.id} className="panel-technical p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900">
                        <span className="text-zinc-400 mr-2">Q{qIdx + 1}.</span>
                        {question.question_text}
                      </p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-zinc-500 uppercase">
                          {question.question_type === 'multiple_choice'
                            ? 'Multiple Choice'
                            : 'True/False'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {question.points} pt{question.points !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {question.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${
                          answer.is_correct
                            ? 'bg-emerald-50 text-emerald-800 font-medium'
                            : 'text-zinc-700'
                        }`}
                      >
                        {answer.is_correct ? (
                          <svg
                            className="w-4 h-4 text-emerald-600 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="w-4 h-4 flex-shrink-0 rounded-full border border-zinc-300" />
                        )}
                        {answer.answer_text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

          {editing && visibleQuestions.length > 0 && (
            <button
              onClick={addNewQuestion}
              className="w-full border-2 border-dashed border-zinc-300 rounded-lg p-4 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              + Add Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorQuizDetail;
