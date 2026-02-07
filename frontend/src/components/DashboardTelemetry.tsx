import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InstructorActivityEvent, InstructorActivityType } from '../types';
import { getInstructorActivityFeed } from '../services/instructorActivity';

interface DashboardTelemetryProps {
  useMockData?: boolean;
  limit?: number;
  pollIntervalMs?: number;
}

const MOCK_STUDENTS = ['A. Chen', 'M. Rivera', 'K. Owens', 'D. Patel', 'S. Brooks', 'J. Kim'];
const MOCK_COURSES = [
  'Data Structures Mastery',
  'Modern React Systems',
  'SQL Performance Tuning',
  'Node API Engineering',
  'Cloud Foundations'
];
const MOCK_LESSONS = [
  'Lesson 1',
  'Lesson 2',
  'Lesson 3',
  'Lesson 4',
  'Lesson 5',
  'Final Assessment'
];

const TYPE_COLORS: Record<InstructorActivityType, string> = {
  SALE: 'text-emerald-400',
  JOIN: 'text-cyan-300',
  PROG: 'text-blue-400',
  RATE: 'text-amber-400'
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '[--:--:--]';
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `[${date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })}]`;
  }

  const datePart = date.toLocaleDateString('sv-SE');
  const timePart = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart} ${timePart}`;
};

const buildEventKey = (event: InstructorActivityEvent): string =>
  `${event.type}|${event.student_name}|${event.course_title}|${event.timestamp}|${event.value}`;

const buildMockValue = (type: InstructorActivityType, index: number): string => {
  if (type === 'SALE') {
    return `+$${(59 + (index % 6) * 20).toFixed(2)}`;
  }

  if (type === 'PROG') {
    return `Completed "${MOCK_LESSONS[index % MOCK_LESSONS.length]}"`;
  }

  if (type === 'RATE') {
    return index % 4 === 0 ? '★★★★☆' : '★★★★★';
  }

  return index % 3 === 0 ? 'Enrollment pending' : 'Enrollment confirmed';
};

const buildMockEvents = (limit: number): InstructorActivityEvent[] => {
  const eventTypes: InstructorActivityType[] = ['SALE', 'JOIN', 'PROG', 'RATE'];
  const now = Date.now();

  return Array.from({ length: limit }).map((_, index) => {
    const type = eventTypes[index % eventTypes.length];
    const offsetSeconds = index * 147 + ((index * 13) % 49);

    return {
      type,
      student_name: MOCK_STUDENTS[index % MOCK_STUDENTS.length],
      course_title: MOCK_COURSES[index % MOCK_COURSES.length],
      timestamp: new Date(now - offsetSeconds * 1000).toISOString(),
      value: buildMockValue(type, index)
    };
  });
};

const DashboardTelemetry = ({
  useMockData = false,
  limit = 20,
  pollIntervalMs = 30000
}: DashboardTelemetryProps) => {
  const [events, setEvents] = useState<InstructorActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [newEventKeys, setNewEventKeys] = useState<Set<string>>(new Set());
  const knownEventKeysRef = useRef<Set<string>>(new Set());
  const hasFetchedOnceRef = useRef(false);

  const normalizedLimit = useMemo(() => {
    if (!Number.isFinite(limit) || limit < 1) {
      return 20;
    }
    return Math.min(Math.floor(limit), 100);
  }, [limit]);

  const applyEvents = useCallback((nextEvents: InstructorActivityEvent[]) => {
    const nextKeys = nextEvents.map(buildEventKey);
    const nextKeySet = new Set(nextKeys);

    if (hasFetchedOnceRef.current) {
      const newKeys = nextKeys.filter((key) => !knownEventKeysRef.current.has(key));
      setNewEventKeys(new Set(newKeys));
    } else {
      setNewEventKeys(new Set());
      hasFetchedOnceRef.current = true;
    }

    knownEventKeysRef.current = nextKeySet;
    setEvents(nextEvents);
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      if (useMockData) {
        applyEvents(buildMockEvents(normalizedLimit));
        setError(null);
        setLastUpdatedAt(new Date());
        return;
      }

      const data = await getInstructorActivityFeed(normalizedLimit);
      applyEvents(data);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch {
      setError('Live activity stream unavailable.');
    } finally {
      setLoading(false);
    }
  }, [applyEvents, normalizedLimit, useMockData]);

  useEffect(() => {
    if (!newEventKeys.size) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNewEventKeys(new Set());
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [newEventKeys]);

  const recentEventsCount = useMemo(() => {
    const now = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;
    return events.filter((event) => now - new Date(event.timestamp).getTime() <= tenMinutesMs).length;
  }, [events]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await fetchFeed();
    };

    run();
    const intervalId = window.setInterval(run, pollIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [fetchFeed, pollIntervalMs]);

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 min-h-[460px]">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">
            Live Activity
          </h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-[0.12em]">
            {events.length} events
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em]">
          <span className="text-zinc-500">{recentEventsCount} in 10m</span>
          {useMockData && (
            <span className="px-2 py-0.5 rounded border border-amber-400/40 bg-amber-500/10 text-amber-200">
              Mock
            </span>
          )}
          <span className="text-zinc-400">
            {lastUpdatedAt
              ? `Sync ${lastUpdatedAt.toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}`
              : 'Sync --:--:--'}
          </span>
        </div>
      </div>

      <div className="bg-zinc-950 text-zinc-300 font-mono">
        {loading ? (
          <div className="px-4 py-4 space-y-2 text-[11px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <p key={i} className="h-3 bg-zinc-900 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-[11px] text-red-300 bg-red-500/5">{error}</div>
        ) : !events.length ? (
          <div className="px-4 py-6 text-[11px] text-zinc-500">No activity events yet.</div>
        ) : (
          <ul className="max-h-[480px] overflow-y-auto text-[11px] leading-5">
            {events.map((event) => {
              const eventKey = buildEventKey(event);
              const isNewEvent = newEventKeys.has(eventKey);

              return (
                <li
                  key={eventKey}
                  className={`px-4 py-2 border-b border-zinc-900 transition-colors ${
                    isNewEvent ? 'bg-emerald-500/10' : 'hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-500 shrink-0">{formatTimestamp(event.timestamp)}</span>
                    <span className={`shrink-0 ${TYPE_COLORS[event.type]}`}>[{event.type}]</span>
                    <span className="text-zinc-200 truncate">{event.student_name}</span>
                    <span className="text-zinc-600 shrink-0">/</span>
                    <span className="text-zinc-400 truncate">{event.course_title}</span>
                    <span className="text-zinc-600 shrink-0">/</span>
                    <span className={`truncate ${TYPE_COLORS[event.type]}`}>{event.value}</span>
                    {isNewEvent && (
                      <span className="text-[10px] uppercase tracking-[0.12em] text-emerald-300 shrink-0">
                        New
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DashboardTelemetry;
