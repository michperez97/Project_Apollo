import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import * as courseApi from '../services/courses';
import { SkeletonCard } from '../components/LoadingStates';
import { Alert, EmptyState } from '../components/Alerts';

const formatPrice = (price?: number | null) => {
  if (!price || Number.isNaN(price)) {
    return 'Free';
  }
  return `$${Number(price).toFixed(0)}`;
};

const resolveTitle = (course: Course) => course.title ?? 'Untitled Course';
const resolveDescription = (course: Course) =>
  course.description ?? 'A guided course built for modern learners.';
const resolveCategory = (course: Course) => course.category ?? 'General';

const LandingPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await courseApi.getCourses();
        setCourses(data);
      } catch (err) {

        setError('Could not load courses.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const featured = useMemo(() => courses[0], [courses]);
  const catalog = useMemo(() => courses.slice(0, 6), [courses]);

  return (
    <div className="min-h-screen">
      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 md:px-10 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2L4 22h3.5l1.5-4h6l1.5 4H20L12 2zm0 5.5L14 15h-4l2-7.5z" />
              </svg>
            </div>
            <div>
              <p className="txt-label">Apollo</p>
              <p className="text-sm font-semibold text-zinc-700">Course Platform</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#catalog" className="btn-secondary text-sm">Catalog</a>
            <Link className="btn-secondary text-sm" to="/login">Sign in</Link>
            <Link className="btn-primary text-sm" to="/register">Create account</Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 md:px-10 pb-16">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <span className="txt-label inline-flex items-center gap-2">
                HUMAN INDUSTRIAL TRAINING
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 tracking-tight">
                Industrial-grade learning, built for real operators.
              </h1>
              <p className="text-lg text-zinc-600 max-w-xl">
                Apollo delivers focused, instructor-led courses with clear progress tracking and practical outcomes. No fluff, just structured learning.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="#catalog" className="btn-primary">Explore courses</a>
                <Link className="btn-secondary" to="/register">Become an instructor</Link>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="glass-card p-4 rounded-2xl">
                  <p className="txt-label">Active Learners</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono">12K+</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                  <p className="txt-label">Completion Rate</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono">96%</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                  <p className="txt-label">Instructors</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono">45+</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl shadow-floating">
              <div className="flex items-center justify-between">
                <span className="txt-label">Featured</span>
                <span className="txt-label">Updated weekly</span>
              </div>
              {featured ? (
                <>
                  <h2 className="text-2xl font-bold text-zinc-900 mt-4">
                    {resolveTitle(featured)}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">{resolveDescription(featured)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="txt-label">{resolveCategory(featured)}</span>
                    <span className="text-lg font-bold text-zinc-900 font-mono">
                      {formatPrice(featured.price)}
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <Link className="btn-primary text-sm" to={`/course/${featured.id}`}>
                      Enroll now
                    </Link>
                    <Link className="btn-secondary text-sm" to={`/course/${featured.id}`}>
                      Preview syllabus
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500 mt-4">No featured course yet.</p>
              )}
            </div>
          </section>

          <section id="catalog" className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="txt-label">Catalog</p>
                <h2 className="text-3xl font-bold text-zinc-900">Start with what matters</h2>
              </div>
              <Link className="btn-secondary text-sm" to="/register">
                Launch your own course →
              </Link>
            </div>

            {error && (
              <div className="mt-6">
                <Alert type="error" message={error} />
              </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loading && Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)}

              {!loading && catalog.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3">
                  <EmptyState title="Courses are arriving" description="Check back soon for the first drop." />
                </div>
              )}

              {!loading &&
                catalog.map((course) => (
                  <div key={course.id} className="glass-card p-5 rounded-2xl group">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wider text-zinc-500 font-mono">
                      <span>{resolveCategory(course)}</span>
                      <span className="px-2 py-1 rounded-full bg-acid/30 text-zinc-700 font-semibold">
                        {formatPrice(course.price)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-zinc-900 group-hover:text-lime-600 transition-colors">
                      {resolveTitle(course)}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
                      {resolveDescription(course)}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        className="text-sm font-semibold text-zinc-700 hover:text-lime-600 transition-colors"
                        to={`/course/${course.id}`}
                      >
                        View syllabus
                      </Link>
                      <Link className="btn-accent text-xs" to={`/course/${course.id}`}>
                        Enroll
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <footer className="mt-16 border-t border-zinc-200 pt-8 flex flex-col md:flex-row justify-between items-center txt-label">
            <p>APOLLO COURSE MARKETPLACE <span className="text-zinc-600 font-bold">v2.0</span></p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span className="flex items-center gap-2">
                STATUS: <span className="text-emerald-600 font-bold">ONLINE</span>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
