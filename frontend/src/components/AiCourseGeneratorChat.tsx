import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiCourse, generateAiCourse, pollAiCourseUntilReady } from '../services/aiCourses';

type Phase = 'idle' | 'generating' | 'success' | 'error';

type AiCourseGeneratorChatProps = {
  open: boolean;
  onClose: () => void;
};

const suggestions = ['Data Structures', 'Web Development', 'Machine Learning'];

const AiCourseGeneratorChat = ({ open, onClose }: AiCourseGeneratorChatProps) => {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<AiCourse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const runIdRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setPrompt('');
      setPhase('idle');
      setError(null);
      setCourse(null);
      runIdRef.current += 1;
    } else {
      runIdRef.current += 1;
    }
  }, [open]);

  const handleClose = () => {
    runIdRef.current += 1;
    onClose();
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || phase === 'generating') {
      return;
    }

    const runId = Date.now();
    runIdRef.current = runId;
    setPhase('generating');
    setError(null);

    try {
      const created = await generateAiCourse(trimmed);
      if (runIdRef.current !== runId) return;

      setCourse(created);

      const finalCourse = await pollAiCourseUntilReady(created.id);
      if (runIdRef.current !== runId) return;

      setCourse(finalCourse);

      if (finalCourse.status === 'ready') {
        setPhase('success');
      } else {
        setPhase('error');
        setError('Apollo AI could not finish the course. Please try again.');
      }
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setPhase('error');
      setError('Apollo AI could not generate your course. Please try again.');
    }
  };

  const handleSuggestion = (value: string) => {
    setPrompt(value);
    inputRef.current?.focus();
  };

  const handleViewCourse = () => {
    if (!course) return;
    navigate(`/ai-course/${course.id}`);
    handleClose();
  };

  const handleRetry = () => {
    setPhase('idle');
    setError(null);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl">
        <div className="glass-card bg-zinc-900/95 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
            <div>
              <p className="txt-label text-zinc-400">Apollo AI</p>
              <h2 className="text-lg sm:text-xl font-semibold text-white mt-2">
                Tell Apollo AI what kind of course you want to create?
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/60 transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.3 5.7L12 12l6.3 6.3-1.3 1.3L10.7 13.3 4.4 19.6 3.1 18.3 9.4 12 3.1 5.7 4.4 4.4l6.3 6.3 6.3-6.3z" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {phase === 'idle' && (
              <div className="space-y-5 animate-fade-in-up">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestion(suggestion)}
                      className="px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/70 text-xs font-medium text-zinc-200 hover:border-acid/60 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the skills, outcomes, and difficulty level you want."
                    className="w-full min-h-[140px] rounded-2xl bg-zinc-950/60 border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-acid/40 focus:border-acid/40 transition"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Each course includes lessons and quizzes.</p>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!prompt.trim()}
                      className="btn-accent px-6"
                    >
                      Generate Course
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'generating' && (
              <div className="flex flex-col items-center justify-center text-center py-10 gap-4 animate-fade-in-up">
                <div className="w-12 h-12 rounded-full border-2 border-acid/30 border-t-acid animate-spin" />
                <div>
                  <p className="text-base font-semibold text-white">Apollo AI is building your course...</p>
                  <p className="text-sm text-zinc-400 mt-2">
                    This can take about a minute. Keep this tab open.
                  </p>
                </div>
              </div>
            )}

            {phase === 'success' && course && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/50">
                  <p className="txt-label text-zinc-400">Course Ready</p>
                  <h3 className="text-xl font-semibold text-white mt-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-zinc-400 mt-2">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">You can keep generating more courses anytime.</p>
                  <button type="button" className="btn-accent px-6" onClick={handleViewCourse}>
                    View Course
                  </button>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10">
                  <p className="text-sm text-red-200">{error ?? 'Something went wrong.'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Refine the prompt or try again.</p>
                  <button type="button" className="btn-secondary" onClick={handleRetry}>
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCourseGeneratorChat;
