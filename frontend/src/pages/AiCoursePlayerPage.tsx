import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import SideNav from '../components/SideNav';
import { Alert } from '../components/Alerts';
import { LoadingCard, Spinner } from '../components/LoadingStates';
import { useAuth } from '../contexts/AuthContext';
import { AiCourse, AiCourseLesson, AiCourseSection, getAiCourse } from '../services/aiCourses';

type LessonWithSection = AiCourseLesson & { sectionId: string; sectionTitle: string };

type QuizSelections = Record<string, Record<string, number>>;

type QuizSubmitted = Record<string, boolean>;

const markdownComponents: Components = {
  h1: (props) => (
    <h1 className="text-2xl font-semibold text-white mt-6 first:mt-0" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-xl font-semibold text-white mt-5 first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg font-semibold text-white mt-4 first:mt-0" {...props} />
  ),
  p: (props) => <p className="text-sm leading-relaxed text-zinc-200" {...props} />,
  ul: (props) => (
    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-200" {...props} />
  ),
  ol: (props) => (
    <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-200" {...props} />
  ),
  li: (props) => <li className="ml-2" {...props} />,
  strong: (props) => <strong className="text-white font-semibold" {...props} />,
  a: (props) => <a className="text-acid underline" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-acid/50 pl-4 text-zinc-300 italic" {...props} />
  ),
  pre: (props) => (
    <pre className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 overflow-x-auto" {...props} />
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return (
      <code
        className={`${
          isInline ? 'bg-zinc-800 px-1 py-0.5 rounded text-xs text-zinc-100' : 'text-xs text-zinc-100'
        } font-mono ${className ?? ''}`}
        {...props}
      >
        {children}
      </code>
    );
  }
};

const AiCoursePlayerPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<AiCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [quizSelections, setQuizSelections] = useState<QuizSelections>({});
  const [quizSubmitted, setQuizSubmitted] = useState<QuizSubmitted>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const id = Number(courseId);
    if (!Number.isFinite(id)) {
      setError('Invalid AI course.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAiCourse(id);
        if (!cancelled) {
          setCourse(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load AI course.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, user, navigate]);

  useEffect(() => {
    if (!course || course.status !== 'generating') {
      return;
    }

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const latest = await getAiCourse(course.id);
        if (cancelled) return;
        setCourse(latest);
        if (latest.status !== 'generating') {
          clearInterval(interval);
        }
      } catch {
        // Silently retry on next interval
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [course]);

  const sections = useMemo(() => {
    if (!course?.content?.sections) {
      return [] as AiCourseSection[];
    }
    return course.content.sections;
  }, [course]);

  const lessons = useMemo(() => {
    if (!sections.length) {
      return [] as LessonWithSection[];
    }

    return sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        ...lesson,
        sectionId: section.id,
        sectionTitle: section.title
      }))
    );
  }, [sections]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }

    setExpandedSections((prev) => {
      if (Object.keys(prev).length) {
        return prev;
      }
      const next: Record<string, boolean> = {};
      sections.forEach((section) => {
        next[section.id] = true;
      });
      return next;
    });

    if (!currentLessonId && lessons.length) {
      setCurrentLessonId(lessons[0].id);
    }
  }, [sections, lessons, currentLessonId]);

  const initialLesson = lessons[0] ?? null;
  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) ?? initialLesson;
  const currentIndex = currentLesson ? lessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const backLink = user?.role === 'student' ? '/student/dashboard' : '/dashboard';

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleSelectLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
  };

  const handleSelectAnswer = (lessonId: string, questionId: string, optionIndex: number) => {
    if (quizSubmitted[lessonId]) {
      return;
    }

    setQuizSelections((prev) => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [questionId]: optionIndex
      }
    }));
  };

  const handleSubmitQuiz = (lessonId: string) => {
    setQuizSubmitted((prev) => ({
      ...prev,
      [lessonId]: true
    }));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="my-learning" />

      <main className="flex-1 relative z-10 min-h-screen overflow-hidden pl-16 transition-all duration-300">
        <div className="h-full overflow-y-auto px-6 md:px-10 py-10">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {loading ? (
            <LoadingCard message="Loading AI course..." />
          ) : !course ? (
            <Alert type="error" message="AI course not found." />
          ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <aside className="glass-card p-4 rounded-2xl h-fit">
                <Link to={backLink} className="btn-secondary text-sm w-full">
                  Back to My Courses
                </Link>

                <div className="mt-4 p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono text-zinc-400 uppercase">AI Course</p>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-acid/80 text-zinc-900">
                      AI Generated
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold mt-2">{course.title}</h2>
                  {course.category && (
                    <p className="text-xs text-zinc-400 mt-1">{course.category}</p>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  {sections.map((section) => (
                    <div key={section.id} className="border border-zinc-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 text-left"
                      >
                        <span className="text-sm font-semibold text-zinc-800">{section.title}</span>
                        <svg
                          className={`w-4 h-4 text-zinc-500 transition-transform ${
                            expandedSections[section.id] ? 'rotate-180' : ''
                          }`}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                      </button>
                      {expandedSections[section.id] && (
                        <div className="px-3 py-2 bg-white">
                          {section.lessons.map((lesson) => {
                            const isActive = lesson.id === currentLesson?.id;
                            return (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => handleSelectLesson(lesson.id)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors border ${
                                  isActive
                                    ? 'bg-acid/40 border-acid/60 text-zinc-900'
                                    : 'border-transparent text-zinc-600 hover:bg-zinc-100'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{lesson.title}</span>
                                  <span className="text-[10px] uppercase text-zinc-500">
                                    {lesson.type === 'quiz' ? 'Quiz' : 'Lesson'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              <section className="glass-card p-6 rounded-2xl min-h-[70vh]">
                {course.status === 'generating' && (
                  <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                    <Spinner size="lg" className="text-acid" />
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">Apollo AI is building your course...</p>
                      <p className="text-sm text-zinc-500 mt-2">This page will update automatically.</p>
                    </div>
                  </div>
                )}

                {course.status === 'failed' && (
                  <Alert type="error" message="Apollo AI could not finish this course." />
                )}

                {course.status === 'ready' && !currentLesson && (
                  <Alert type="warning" message="No lessons are available for this AI course yet." />
                )}

                {course.status === 'ready' && currentLesson && (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="txt-label">Lesson {currentIndex + 1} of {lessons.length}</p>
                        <h1 className="text-2xl font-semibold text-zinc-900 mt-2">{currentLesson.title}</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                          {currentLesson.sectionTitle} · {currentLesson.type === 'quiz' ? 'Quiz' : 'Lesson'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-acid/60 text-zinc-900">
                        AI Generated
                      </span>
                    </div>

                    {currentLesson.type === 'text' && (
                      <div className="rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 p-6">
                        <ReactMarkdown components={markdownComponents}>
                          {currentLesson.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {currentLesson.type === 'quiz' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">Quiz Checkpoint</p>
                            <p className="text-xs text-zinc-500">Answer all questions, then submit.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {currentLesson.quiz.questions.map((question, index) => {
                            const selections = quizSelections[currentLesson.id] ?? {};
                            const selectedOption = selections[question.id];
                            const isSubmitted = quizSubmitted[currentLesson.id];

                            return (
                              <div key={question.id} className="border border-zinc-200 rounded-2xl p-4 bg-white">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {index + 1}. {question.question}
                                </p>
                                <div className="mt-3 space-y-2">
                                  {question.options.map((option, optionIndex) => {
                                    const isSelected = selectedOption === optionIndex;
                                    const isCorrect = isSubmitted && optionIndex === question.correctIndex;
                                    const isWrong = isSubmitted && isSelected && optionIndex !== question.correctIndex;
                                    const base =
                                      'flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors';
                                    const state = isCorrect
                                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                                      : isWrong
                                        ? 'border-red-400 bg-red-50 text-red-900'
                                        : isSelected
                                          ? 'border-zinc-400 bg-zinc-100 text-zinc-900'
                                          : 'border-zinc-200 hover:border-zinc-300';

                                    return (
                                      <label key={option} className={`${base} ${state}`}>
                                        <input
                                          type="radio"
                                          name={`${currentLesson.id}-${question.id}`}
                                          className="sr-only"
                                          checked={isSelected}
                                          onChange={() => handleSelectAnswer(currentLesson.id, question.id, optionIndex)}
                                          disabled={isSubmitted}
                                        />
                                        <span>{option}</span>
                                        {isCorrect && (
                                          <span className="ml-auto text-xs font-semibold">Correct</span>
                                        )}
                                        {isWrong && (
                                          <span className="ml-auto text-xs font-semibold">Incorrect</span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                                {isSubmitted && (
                                  <p className="mt-3 text-xs text-zinc-500">
                                    {selectedOption === question.correctIndex ? 'Correct.' : 'Incorrect.'}{' '}
                                    {question.explanation}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {(() => {
                          const selections = quizSelections[currentLesson.id] ?? {};
                          const answeredCount = currentLesson.quiz.questions.filter(
                            (question) => selections[question.id] !== undefined
                          ).length;
                          const allAnswered = answeredCount === currentLesson.quiz.questions.length;
                          const isSubmitted = quizSubmitted[currentLesson.id];
                          const correctCount = isSubmitted
                            ? currentLesson.quiz.questions.filter(
                                (question) => selections[question.id] === question.correctIndex
                              ).length
                            : 0;
                          const scorePercent = isSubmitted
                            ? Math.round((correctCount / currentLesson.quiz.questions.length) * 100)
                            : 0;

                          return (
                            <div className="space-y-4">
                              {isSubmitted && (
                                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
                                  <div className="flex items-center justify-between text-sm font-semibold text-zinc-800">
                                    <span>Score</span>
                                    <span>
                                      {correctCount}/{currentLesson.quiz.questions.length} ({scorePercent}%)
                                    </span>
                                  </div>
                                  <div className="mt-2 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-acid"
                                      style={{ width: `${scorePercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleSubmitQuiz(currentLesson.id)}
                                disabled={!allAnswered || isSubmitted}
                              >
                                {isSubmitted ? 'Quiz Submitted' : 'Submit Quiz'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-5">
                      <button
                        className="btn-secondary"
                        onClick={() => prevLesson && handleSelectLesson(prevLesson.id)}
                        disabled={!prevLesson}
                      >
                        Previous
                      </button>
                      <p className="text-xs text-zinc-500">Lesson {currentIndex + 1} of {lessons.length}</p>
                      <button
                        className="btn-primary"
                        onClick={() => nextLesson && handleSelectLesson(nextLesson.id)}
                        disabled={!nextLesson}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AiCoursePlayerPage;
