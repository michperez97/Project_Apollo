import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  createQuiz,
  deleteQuiz as deleteQuizService,
  getQuizzesByCourse,
  Quiz
} from '../services/quizzes';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

interface QuizForm {
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes: number | null;
}

const defaultQuizForm: QuizForm = {
  title: '',
  description: '',
  passing_score: 70,
  time_limit_minutes: 30
};

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
  const [quizForm, setQuizForm] = useState<QuizForm>(defaultQuizForm);

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
      setShowQuizForm(false);
      setQuizForm(defaultQuizForm);
      navigate(`/instructor/courses/${courseId}/quizzes/${newQuiz.id}`, { state: { editing: true } });
    } catch (err) {
      console.error(err);
      setError('Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQuiz = async (e: React.MouseEvent, quizId: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this quiz? This will also delete all its questions.')) return;

    setError(null);
    try {
      await deleteQuizService(quizId);
      setSuccess('Quiz deleted successfully!');
      await loadQuizzes();
    } catch (err) {
      console.error(err);
      setError('Failed to delete quiz');
    }
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
          {!showQuizForm && (
            <button onClick={() => { setQuizForm(defaultQuizForm); setShowQuizForm(true); }} className="btn-primary">
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
                  onClick={() => { setShowQuizForm(false); setQuizForm(defaultQuizForm); }}
                  className="btn-secondary px-6"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showQuizForm && (
          <div className="panel-technical p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Your Quizzes</h2>
            {quizzes.length === 0 ? (
              <p className="text-zinc-500">No quizzes created yet. Create your first quiz to get started!</p>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => navigate(`/instructor/courses/${courseId}/quizzes/${quiz.id}`)}
                    className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-400 transition-colors cursor-pointer"
                  >
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
                        onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Delete
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
