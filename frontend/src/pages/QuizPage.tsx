import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizAttempts,
  QuizWithQuestions,
  QuizAttempt,
  QuizQuestion
} from '../services/quizzes';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
  } | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      if (!quizId) return;
      setLoading(true);
      setError(null);
      try {
        const [quizData, attempts] = await Promise.all([
          getQuiz(Number(quizId)),
          getQuizAttempts(Number(quizId))
        ]);
        setQuiz(quizData);
        setPastAttempts(attempts);
      } catch (err) {
        console.error(err);
        setError('Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quizId, user, navigate]);

  const handleStartQuiz = async () => {
    if (!quizId) return;
    try {
      const attempt = await startQuizAttempt(Number(quizId));
      setCurrentAttempt(attempt);
      setAnswers({});
      setResult(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to start quiz.');
    }
  };

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  };

  const handleSubmit = async () => {
    if (!currentAttempt || !quiz) return;

    const responses = quiz.questions.map((q) => ({
      question_id: q.id,
      selected_answer_id: answers[q.id] || null
    }));

    setSubmitting(true);
    setError(null);
    try {
      const submitResult = await submitQuizAttempt(currentAttempt.id, responses);
      setResult(submitResult);
      setCurrentAttempt(null);
      const attempts = await getQuizAttempts(Number(quizId));
      setPastAttempts(attempts);
    } catch (err) {
      console.error(err);
      setError('Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingCard />;
  if (!quiz) return <Alert type="error">Quiz not found</Alert>;

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const bestAttempt = pastAttempts.filter((a) => a.score !== null).sort((a, b) => (b.score || 0) - (a.score || 0))[0];

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to={`/courses/${quiz.quiz.course_id}/player`}
          className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Course
        </Link>

        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {result && (
          <div className={`panel-technical p-6 mb-6 ${result.passed ? 'border-l-4 border-emerald-500' : 'border-l-4 border-amber-500'}`}>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Quiz Complete!</h3>
            <div className="flex items-center gap-4">
              <div>
                <p className="txt-label">SCORE</p>
                <p className="text-2xl font-bold text-zinc-900">{result.score.toFixed(1)}%</p>
              </div>
              <div>
                <p className="txt-label">POINTS</p>
                <p className="text-lg text-zinc-700">
                  {result.earnedPoints} / {result.totalPoints}
                </p>
              </div>
              <div>
                <p className="txt-label">RESULT</p>
                <p className={`text-lg font-semibold ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {result.passed ? 'PASSED' : 'NOT PASSED'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!currentAttempt && !result && (
          <div className="panel-technical p-8 mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">{quiz.quiz.title}</h1>
            {quiz.quiz.description && <p className="text-zinc-600 mb-6">{quiz.quiz.description}</p>}

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="stat-card">
                <p className="txt-label">QUESTIONS</p>
                <p className="text-2xl font-bold text-zinc-900">{quiz.questions.length}</p>
              </div>
              <div className="stat-card">
                <p className="txt-label">PASSING SCORE</p>
                <p className="text-2xl font-bold text-zinc-900">{quiz.quiz.passing_score}%</p>
              </div>
              <div className="stat-card">
                <p className="txt-label">TIME LIMIT</p>
                <p className="text-2xl font-bold text-zinc-900">
                  {quiz.quiz.time_limit_minutes ? `${quiz.quiz.time_limit_minutes}m` : 'None'}
                </p>
              </div>
            </div>

            {bestAttempt && (
              <div className="bg-stone-50 border border-zinc-200 rounded-lg p-4 mb-6">
                <p className="txt-label mb-2">YOUR BEST SCORE</p>
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-bold text-zinc-900">{bestAttempt.score?.toFixed(1)}%</p>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      bestAttempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {bestAttempt.passed ? 'PASSED' : 'NOT PASSED'}
                  </span>
                </div>
              </div>
            )}

            <button onClick={handleStartQuiz} className="btn-primary w-full">
              {pastAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </button>
          </div>
        )}

        {currentAttempt && (
          <div className="panel-technical p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">{quiz.quiz.title}</h2>
              <p className="txt-label">
                {Object.keys(answers).length} / {quiz.questions.length} ANSWERED
              </p>
            </div>

            <div className="space-y-6">
              {quiz.questions.map((question, idx) => (
                <div key={question.id} className="bg-stone-50 border border-zinc-200 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="txt-mono bg-zinc-900 text-white px-2 py-1 rounded text-sm">Q{idx + 1}</span>
                    <p className="text-zinc-900 font-medium flex-1">{question.question_text}</p>
                    <span className="txt-label">{question.points} PT{question.points !== 1 ? 'S' : ''}</span>
                  </div>

                  <div className="space-y-2 ml-10">
                    {question.answers.map((answer) => (
                      <label
                        key={answer.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[question.id] === answer.id
                            ? 'border-zinc-900 bg-white'
                            : 'border-zinc-200 hover:border-zinc-400 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={answer.id}
                          checked={answers[question.id] === answer.id}
                          onChange={() => handleAnswerSelect(question.id, answer.id)}
                          className="w-4 h-4 text-zinc-900"
                        />
                        <span className="text-zinc-700">{answer.answer_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="btn-primary flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
              <button onClick={() => setCurrentAttempt(null)} className="btn-secondary px-6">
                Cancel
              </button>
            </div>

            {!allAnswered && (
              <p className="text-amber-600 text-sm mt-3 text-center">
                Please answer all questions before submitting
              </p>
            )}
          </div>
        )}

        {pastAttempts.length > 0 && !currentAttempt && (
          <div className="panel-technical p-6 mt-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Attempt History</h3>
            <div className="space-y-2">
              {pastAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div>
                    <p className="txt-label">
                      {new Date(attempt.started_at).toLocaleDateString()} at{' '}
                      {new Date(attempt.started_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.score !== null && (
                      <>
                        <span className="text-lg font-bold text-zinc-900">{attempt.score.toFixed(1)}%</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {attempt.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
