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

const resolveTitle = (course: Course) => course.title ?? course.name ?? 'Untitled Course';
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
        console.error(err);
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
    <div className="apollo-landing min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">
              A
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Apollo</p>
              <p className="text-lg font-semibold text-slate-900">Course Platform</p>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a className="px-3 py-2 text-slate-600 hover:text-slate-900" href="#catalog">
              Catalog
            </a>
            <Link className="px-3 py-2 text-slate-600 hover:text-slate-900" to="/login">
              Sign in
            </Link>
            <Link
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20"
              to="/register"
            >
              Create account
            </Link>
          </nav>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16">
          <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <p className="apollo-chip inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                New semester, new mastery
              </p>
              <h1 className="apollo-hero-title text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Build serious skills with focused, instructor-led courses.
              </h1>
              <p className="text-lg text-slate-600 max-w-xl">
                Apollo is a marketplace for modern course creators. Learn with structured lessons, crisp
                feedback, and progress tracking that keeps you moving.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/30"
                  href="#catalog"
                >
                  Explore courses
                </a>
                <Link
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700"
                  to="/register"
                >
                  Become an instructor
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 text-sm text-slate-600">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">12k+</p>
                  <p>active learners</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">45+</p>
                  <p>expert instructors</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">96%</p>
                  <p>completion rate</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="apollo-card animate-[apollo-fade-up_0.8s_ease-out_both]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Featured
                  </span>
                  <span className="text-xs text-slate-500">Updated weekly</span>
                </div>
                {featured ? (
                  <>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      {resolveTitle(featured)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">{resolveDescription(featured)}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-slate-500">{resolveCategory(featured)}</span>
                      <span className="text-lg font-semibold text-slate-900">
                        {formatPrice(featured.price)}
                      </span>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <Link
                        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
                        to="/login"
                      >
                        Enroll now
                      </Link>
                      <Link className="text-sm font-semibold text-slate-700" to="/login">
                        Preview syllabus
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">No featured course yet.</p>
                )}
              </div>
            </div>
          </section>

          <section id="catalog" className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Catalog</p>
                <h2 className="text-3xl font-semibold text-slate-900">Start with what matters</h2>
              </div>
              <Link className="text-sm font-semibold text-slate-700" to="/register">
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
                catalog.map((course, index) => (
                  <div
                    key={course.id}
                    className="apollo-course-card animate-[apollo-fade-up_0.7s_ease-out_both]"
                    style={{ animationDelay: `${120 + index * 80}ms` }}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                      <span>{resolveCategory(course)}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        {formatPrice(course.price)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      {resolveTitle(course)}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{resolveDescription(course)}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs text-slate-500">8 lessons • 2h 40m</span>
                      <Link className="text-sm font-semibold text-slate-700" to="/login">
                        View course →
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
