import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getCourseContent,
  getCourseProgress,
  updateLessonProgress,
  CourseContentResponse,
  CourseLesson,
  LessonProgress
} from '../services/content';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

const CoursePlayerPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<CourseContentResponse | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    const load = async () => {
      if (!courseId) return;
      setLoading(true);
      setError(null);
      try {
        const contentData = await getCourseContent(Number(courseId));

        if (!contentData.hasFullAccess) {
          setContent(contentData);
          setError('You are not enrolled in this course.');
          setLoading(false);
          return;
        }

        const progressData = await getCourseProgress(Number(courseId));
        setContent(contentData);
        setProgress(progressData);

        const allLessons = contentData.sections.flatMap((s) => s.lessons);
        if (allLessons.length > 0) {
          const inProgressLesson = allLessons.find((l) => {
            const p = progressData.find((pr) => pr.lesson_id === l.id);
            return p && p.status === 'in_progress';
          });
          setCurrentLesson(inProgressLesson || allLessons[0]);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load course.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, user, navigate]);

  const handleLessonSelect = (lesson: CourseLesson) => {
    setCurrentLesson(lesson);
  };

  const handleVideoTimeUpdate = useCallback(async () => {
    if (!videoRef.current || !currentLesson) return;
    const currentTime = Math.floor(videoRef.current.currentTime);
    const now = Date.now();

    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;

    try {
      await updateLessonProgress(currentLesson.id, {
        status: 'in_progress',
        last_position_seconds: currentTime
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }, [currentLesson]);

  const handleVideoEnded = async () => {
    if (!currentLesson) return;
    try {
      const updated = await updateLessonProgress(currentLesson.id, { status: 'completed' });
      setProgress((prev) => {
        const existing = prev.findIndex((p) => p.lesson_id === currentLesson.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    } catch (err) {
      console.error('Failed to mark as completed:', err);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    try {
      const updated = await updateLessonProgress(currentLesson.id, { status: 'completed' });
      setProgress((prev) => {
        const existing = prev.findIndex((p) => p.lesson_id === currentLesson.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    } catch (err) {
      console.error('Failed to mark as completed:', err);
    }
  };

  useEffect(() => {
    if (currentLesson && videoRef.current) {
      const lessonProgress = progress.find((p) => p.lesson_id === currentLesson.id);
      if (lessonProgress && lessonProgress.last_position_seconds > 0) {
        videoRef.current.currentTime = lessonProgress.last_position_seconds;
      }
    }
  }, [currentLesson, progress]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <LoadingCard message="Loading course..." />
      </div>
    );
  }

  if (error || !content) {
    const notEnrolled = error?.includes('not enrolled');
    return (
      <div className="min-h-screen px-6 md:px-10 py-10">
        <Alert type="error" message={error || 'Course not found'} />
        <div className="flex gap-3 mt-4">
          {notEnrolled && courseId && (
            <Link to={`/course/${courseId}`} className="btn-primary">
              View Course Details
            </Link>
          )}
          <Link to="/student/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allLessons = content.sections.flatMap((s) => s.lessons);
  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const progressPercent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  const renderLessonContent = () => {
    if (!currentLesson) return <p className="text-zinc-500">Select a lesson to begin.</p>;

    const lessonProgress = progress.find((p) => p.lesson_id === currentLesson.id);
    const isCompleted = lessonProgress?.status === 'completed';

    if (currentLesson.lesson_type === 'video') {
      return (
        <div className="space-y-3">
          {currentLesson.video_url ? (
            <video
              ref={videoRef}
              src={currentLesson.video_url}
              controls
              className="w-full rounded-xl bg-black border border-zinc-200"
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="bg-zinc-100 h-64 flex items-center justify-center rounded-xl border border-zinc-200">
              <p className="text-zinc-500">Video not available</p>
            </div>
          )}
          {isCompleted && (
            <p className="text-emerald-600 text-sm font-medium">Completed</p>
          )}
        </div>
      );
    }

    if (currentLesson.lesson_type === 'text') {
      return (
        <div className="space-y-4">
          {currentLesson.content ? (
            <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {currentLesson.content}
            </div>
          ) : (
            <p className="text-zinc-500">No content available.</p>
          )}
          <div>
            {isCompleted ? (
              <p className="text-emerald-600 text-sm font-medium">Completed</p>
            ) : (
              <button className="btn-primary" onClick={handleMarkComplete}>
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      );
    }

    if (currentLesson.lesson_type === 'quiz') {
      // Check if this lesson has a linked quiz (new quiz system)
      // For now, we'll redirect to the quiz page based on lesson title matching
      // In a full implementation, you'd store quiz_id in the lesson or fetch quizzes by lesson_id
      return (
        <div className="panel-technical p-8">
          <h3 className="text-xl font-bold text-zinc-900 mb-4">{currentLesson.title}</h3>
          <p className="text-zinc-600 mb-6">
            This quiz will test your knowledge of data structures and algorithms.
          </p>
          <div className="bg-stone-50 border border-zinc-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="txt-label mb-1">QUESTIONS</p>
                <p className="text-2xl font-bold text-zinc-900">3</p>
              </div>
              <div>
                <p className="txt-label mb-1">PASSING SCORE</p>
                <p className="text-2xl font-bold text-zinc-900">70%</p>
              </div>
              <div>
                <p className="txt-label mb-1">TIME LIMIT</p>
                <p className="text-2xl font-bold text-zinc-900">30m</p>
              </div>
            </div>
          </div>
          <Link to="/quiz/1" className="btn-primary">
            Take Quiz
          </Link>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="floating-tile">
            <Link to="/student/dashboard" className="txt-label block mb-1">
              Back to Dashboard
            </Link>
            <h1 className="text-lg font-bold text-zinc-900">{content.course.title}</h1>
            <span className="txt-label">Course Player</span>
          </div>
          <div className="glass-card px-4 py-3 rounded-2xl">
            <p className="txt-label">Progress</p>
            <p className="text-lg font-bold text-zinc-900 font-mono">{progressPercent}%</p>
            <div className="mt-2 w-48 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-acid h-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {completedCount}/{allLessons.length} lessons completed
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden px-6 md:px-10 pb-6 gap-6">
        <aside className="w-full lg:w-80 glass-card p-4 rounded-2xl overflow-y-auto">
          <h2 className="txt-label mb-3">Course Outline</h2>
          {content.sections.map((section) => (
            <div key={section.id} className="mb-4">
              <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-800">
                {section.title}
              </div>
              <ul className="mt-2 space-y-1">
                {section.lessons.map((lesson) => {
                  const lessonProgress = progress.find((p) => p.lesson_id === lesson.id);
                  const isCompleted = lessonProgress?.status === 'completed';
                  const isActive = currentLesson?.id === lesson.id;

                  return (
                    <li
                      key={lesson.id}
                      className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isActive
                          ? 'border-acid/60 bg-acid/20'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                      onClick={() => handleLessonSelect(lesson)}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="text-emerald-600 text-xs">✓</span>
                        )}
                        <span className={`text-sm ${isActive ? 'text-zinc-900 font-semibold' : 'text-zinc-700'}`}>
                          {lesson.title}
                        </span>
                        {lesson.is_preview && (
                          <span className="ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-acid/30 text-zinc-700">
                            Preview
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="glass-card p-6 rounded-2xl max-w-3xl">
            {currentLesson ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="txt-label">{currentLesson.lesson_type}</span>
                  {currentLesson.is_preview && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                      Preview
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-4">{currentLesson.title}</h2>
                {renderLessonContent()}
              </>
            ) : (
              <p className="text-zinc-500">Select a lesson to begin.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoursePlayerPage;
