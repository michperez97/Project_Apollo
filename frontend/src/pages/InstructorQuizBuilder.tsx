import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createQuiz, addQuestion, getQuizzesByCourse, Quiz } from '../services/quizzes';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

interface QuizForm {
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes: number | null;
}

interface QuestionForm {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  answers: Array<{
    answer_text: string;
    is_correct: boolean;
    position: number;
  }>;
}

const InstructorQuizBuilder = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<number | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const [quizForm, setQuizForm] = useState<QuizForm>({
    title: '',
    description: '',
    passing_score: 70,
    time_limit_minutes: 30
  });

  const [questionForm, setQuestionForm] = useState<QuestionForm>({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    answers: [
      { answer_text: '', is_correct: false, position: 1 },
      { answer_text: '', is_correct: false, position: 2 }
    ]
  });

  useEffect(() => {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    loadQuizzes();
  }, [courseId, user, navigate]);

  const loadQuizzes = async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizzesByCourse(Number(courseId));
      setQuizzes(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setCreating(true);
    setError(null);
    try {
      const newQuiz = await createQuiz({
        course_id: Number(courseId),
        ...quizForm
      });
      setSuccess('Quiz created successfully!');
      setCurrentQuizId(newQuiz.id);
      setShowQuizForm(false);
      setShowQuestionForm(true);
      await loadQuizzes();
    } catch (err) {
      console.error(err);
      setError('Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuizId) return;

    // Validate at least one correct answer
    const hasCorrectAnswer = questionForm.answers.some(a => a.is_correct && a.answer_text.trim());
    if (!hasCorrectAnswer) {
      setError('Please mark at least one answer as correct');
      return;
    }

    // Filter out empty answers
    const validAnswers = questionForm.answers.filter(a => a.answer_text.trim());
    if (validAnswers.length < 2) {
      setError('Please provide at least 2 answers');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await addQuestion(currentQuizId, {
        ...questionForm,
        position: 0,
        answers: validAnswers
      });
      setSuccess('Question added successfully!');
      // Reset form
      setQuestionForm({
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        answers: [
          { answer_text: '', is_correct: false, position: 1 },
          { answer_text: '', is_correct: false, position: 2 }
        ]
      });
    } catch (err) {
      console.error(err);
      setError('Failed to add question');
    } finally {
      setCreating(false);
    }
  };

  const addAnswerOption = () => {
    setQuestionForm({
      ...questionForm,
      answers: [
        ...questionForm.answers,
        { answer_text: '', is_correct: false, position: questionForm.answers.length + 1 }
      ]
    });
  };

  const updateAnswer = (index: number, field: 'answer_text' | 'is_correct', value: string | boolean) => {
    const newAnswers = [...questionForm.answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setQuestionForm({ ...questionForm, answers: newAnswers });
  };

  const removeAnswer = (index: number) => {
    if (questionForm.answers.length <= 2) return;
    const newAnswers = questionForm.answers.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, answers: newAnswers });
  };

  if (loading) return <LoadingCard />;

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link
                to="/instructor/courses"
                className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Courses
              </Link>
              <span className="text-zinc-300">/</span>
              <Link
                to={`/instructor/courses/${courseId}/builder`}
                className="text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Builder
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Quiz Management</h1>
          </div>
          {!showQuizForm && !showQuestionForm && (
            <button onClick={() => setShowQuizForm(true)} className="btn-primary">
              Create New Quiz
            </button>
          )}
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {showQuizForm && (
          <div className="panel-technical p-8 mb-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Create Quiz</h2>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block txt-label mb-2">QUIZ TITLE</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block txt-label mb-2">DESCRIPTION</label>
                <textarea
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
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
                    value={quizForm.passing_score}
                    onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    required
                  />
                </div>
                <div>
                  <label className="block txt-label mb-2">TIME LIMIT (MINUTES)</label>
                  <input
                    type="number"
                    min="1"
                    value={quizForm.time_limit_minutes || ''}
                    onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: Number(e.target.value) || null })}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Create Quiz'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuizForm(false)}
                  className="btn-secondary px-6"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showQuestionForm && currentQuizId && (
          <div className="panel-technical p-8 mb-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Add Question to Quiz</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block txt-label mb-2">QUESTION TEXT</label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block txt-label mb-2">QUESTION TYPE</label>
                  <select
                    value={questionForm.question_type}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value as 'multiple_choice' | 'true_false' })}
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
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block txt-label mb-2">ANSWERS</label>
                {questionForm.answers.map((answer, idx) => (
                  <div key={idx} className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={answer.is_correct}
                      onChange={(e) => updateAnswer(idx, 'is_correct', e.target.checked)}
                      className="w-5 h-5"
                      title="Mark as correct"
                    />
                    <input
                      type="text"
                      value={answer.answer_text}
                      onChange={(e) => updateAnswer(idx, 'answer_text', e.target.value)}
                      placeholder={`Answer ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    {questionForm.answers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAnswer(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAnswerOption}
                  className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                >
                  + Add Answer Option
                </button>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Adding...' : 'Add Question'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionForm(false);
                    setCurrentQuizId(null);
                  }}
                  className="btn-secondary px-6"
                >
                  Done Adding Questions
                </button>
              </div>
            </form>
          </div>
        )}

        {!showQuizForm && !showQuestionForm && (
          <div className="panel-technical p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Your Quizzes</h2>
            {quizzes.length === 0 ? (
              <p className="text-zinc-500">No quizzes created yet. Create your first quiz to get started!</p>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-400 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-zinc-900">{quiz.title}</h3>
                        {quiz.description && <p className="text-sm text-zinc-600 mt-1">{quiz.description}</p>}
                        <div className="flex gap-4 mt-2">
                          <span className="txt-label">Passing: {quiz.passing_score}%</span>
                          <span className="txt-label">
                            Time: {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : 'Unlimited'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentQuizId(quiz.id);
                          setShowQuestionForm(true);
                        }}
                        className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                      >
                        Add Questions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorQuizBuilder;
