import pool from '../config/database';
import { findUserById } from '../models/userModel';
import { listReadNotificationKeys } from '../models/notificationReadModel';
import { AuthPayload } from '../types/auth';

export type NotificationTone = 'info' | 'success' | 'warning';

export interface NotificationFeedItem {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  created_at: Date;
  is_read: boolean;
}

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;
const INSTRUCTOR_ENROLLMENT_LIMIT = 8;
const INSTRUCTOR_PENDING_LIMIT = 5;
const INSTRUCTOR_ANNOUNCEMENT_LIMIT = 5;
const ADMIN_PENDING_LIMIT = 8;
const ADMIN_DIRECT_SALES_LIMIT = 5;
const STUDENT_ENROLLMENT_LIMIT = 10;
const STUDENT_ANNOUNCEMENT_LIMIT = 5;

const asUnread = (item: Omit<NotificationFeedItem, 'is_read'>): NotificationFeedItem => ({
  ...item,
  is_read: false
});

const clampLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, MAX_LIMIT);
};

const formatUsd = (amount: string | number): string => Number(amount).toFixed(2);

const toTimestamp = (value: Date): number => new Date(value).getTime();

const withReadState = async (
  userId: number,
  items: NotificationFeedItem[]
): Promise<NotificationFeedItem[]> => {
  if (!items.length) {
    return [];
  }

  const readKeys = await listReadNotificationKeys(
    userId,
    items.map((item) => item.id)
  );

  return items.map((item) => ({
    ...item,
    is_read: readKeys.has(item.id)
  }));
};

const getInstructorNotifications = async (userId: number): Promise<NotificationFeedItem[]> => {
  const [enrollmentRows, pendingRows, announcementRows] = await Promise.all([
    pool.query<{
      enrollment_id: number;
      created_at: Date;
      course_title: string;
      student_first_name: string;
      student_last_name: string;
    }>(
      `SELECT
         e.id AS enrollment_id,
         e.enrolled_at AS created_at,
         c.title AS course_title,
         u.first_name AS student_first_name,
         u.last_name AS student_last_name
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = e.student_id
       WHERE c.instructor_id = $1
       ORDER BY e.enrolled_at DESC
       LIMIT $2`,
      [userId, INSTRUCTOR_ENROLLMENT_LIMIT]
    ),
    pool.query<{
      course_id: number;
      title: string;
      created_at: Date;
    }>(
      `SELECT
         c.id AS course_id,
         c.title,
         c.updated_at AS created_at
       FROM courses c
       WHERE c.instructor_id = $1
         AND c.status = 'pending'
       ORDER BY c.updated_at DESC
       LIMIT $2`,
      [userId, INSTRUCTOR_PENDING_LIMIT]
    ),
    pool.query<{
      announcement_id: number;
      created_at: Date;
      title: string;
    }>(
      `SELECT
         a.id AS announcement_id,
         a.created_at,
         a.title
       FROM announcements a
       WHERE a.teacher_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [userId, INSTRUCTOR_ANNOUNCEMENT_LIMIT]
    )
  ]);

  const enrollments = enrollmentRows.rows.map((row) =>
    asUnread({
      id: `enrollment-${row.enrollment_id}`,
      title: 'New Enrollment',
      message: `${row.student_first_name} ${row.student_last_name} enrolled in ${row.course_title}.`,
      tone: 'success',
      created_at: row.created_at
    })
  );

  const pendingCourses = pendingRows.rows.map((row) =>
    asUnread({
      id: `pending-course-${row.course_id}`,
      title: 'Course Pending Review',
      message: `${row.title} is waiting for admin approval.`,
      tone: 'warning',
      created_at: row.created_at
    })
  );

  const announcements = announcementRows.rows.map((row) =>
    asUnread({
      id: `announcement-${row.announcement_id}`,
      title: 'Announcement Posted',
      message: `You published "${row.title}".`,
      tone: 'info',
      created_at: row.created_at
    })
  );

  return [...enrollments, ...pendingCourses, ...announcements];
};

const getAdminNotifications = async (): Promise<NotificationFeedItem[]> => {
  const [pendingCourses, recentPayments] = await Promise.all([
    pool.query<{
      course_id: number;
      title: string;
      created_at: Date;
    }>(
      `SELECT
         c.id AS course_id,
         c.title,
         c.updated_at AS created_at
       FROM courses c
       WHERE c.status = 'pending'
       ORDER BY c.updated_at DESC
       LIMIT $1`,
      [ADMIN_PENDING_LIMIT]
    ),
    pool.query<{
      enrollment_id: number;
      course_title: string;
      amount: string;
      created_at: Date;
    }>(
      `SELECT
         e.id AS enrollment_id,
         c.title AS course_title,
         e.tuition_amount::text AS amount,
         e.enrolled_at AS created_at
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.payment_status = 'paid'
       ORDER BY e.enrolled_at DESC
       LIMIT $1`,
      [ADMIN_DIRECT_SALES_LIMIT]
    )
  ]);

  const pending = pendingCourses.rows.map((row) =>
    asUnread({
      id: `admin-pending-${row.course_id}`,
      title: 'Moderation Needed',
      message: `${row.title} is pending moderation review.`,
      tone: 'warning',
      created_at: row.created_at
    })
  );

  const payments = recentPayments.rows.map((row) =>
    asUnread({
      id: `admin-paid-${row.enrollment_id}`,
      title: 'Direct Sale',
      message: `${row.course_title} received a payment of $${formatUsd(row.amount)}.`,
      tone: 'success',
      created_at: row.created_at
    })
  );

  return [...pending, ...payments];
};

const getStudentNotifications = async (userId: number): Promise<NotificationFeedItem[]> => {
  const [enrollmentRows, announcementRows, user] = await Promise.all([
    pool.query<{
      enrollment_id: number;
      created_at: Date;
      course_title: string;
      payment_status: 'pending' | 'paid' | 'partial';
      tuition_amount: string;
    }>(
      `SELECT
         e.id AS enrollment_id,
         e.enrolled_at AS created_at,
         c.title AS course_title,
         e.payment_status,
         e.tuition_amount::text AS tuition_amount
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC
       LIMIT $2`,
      [userId, STUDENT_ENROLLMENT_LIMIT]
    ),
    pool.query<{
      announcement_id: number;
      created_at: Date;
      announcement_title: string;
      course_title: string;
    }>(
      `SELECT
         a.id AS announcement_id,
         a.created_at,
         a.title AS announcement_title,
         c.title AS course_title
       FROM announcements a
       JOIN courses c ON c.id = a.course_id
       WHERE EXISTS (
         SELECT 1
         FROM enrollments e
         WHERE e.course_id = c.id
           AND e.student_id = $1
           AND e.payment_status = 'paid'
       )
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [userId, STUDENT_ANNOUNCEMENT_LIMIT]
    ),
    findUserById(userId)
  ]);

  const enrollmentNotifs = enrollmentRows.rows.map((row) => {
    if (row.payment_status === 'paid') {
      return asUnread({
        id: `student-paid-${row.enrollment_id}`,
        title: 'Enrollment Active',
        message: `You have active access to ${row.course_title}.`,
        tone: 'success',
        created_at: row.created_at
      });
    }

    return asUnread({
      id: `student-pending-${row.enrollment_id}`,
      title: 'Payment Pending',
      message: `${row.course_title} still requires payment of $${formatUsd(row.tuition_amount)}.`,
      tone: 'warning',
      created_at: row.created_at
    });
  });

  const announcements = announcementRows.rows.map((row) =>
    asUnread({
      id: `student-announcement-${row.announcement_id}`,
      title: `Course Update: ${row.course_title}`,
      message: row.announcement_title,
      tone: 'info',
      created_at: row.created_at
    })
  );

  const subscriptionItems: NotificationFeedItem[] = [];
  if (user?.subscription_status === 'active') {
    const periodEnd = user.current_period_end ? new Date(user.current_period_end) : undefined;
    const subscriptionMessage =
      periodEnd && !Number.isNaN(periodEnd.getTime())
        ? `Your all-access plan is active until ${periodEnd.toLocaleDateString()}.`
        : 'Your all-access plan is active.';

    subscriptionItems.push(
      asUnread({
        id: `student-subscription-${userId}`,
        title: 'All-Access Subscription Active',
        message: subscriptionMessage,
        tone: 'success',
        created_at: user.updated_at
      })
    );
  }

  return [...subscriptionItems, ...enrollmentNotifs, ...announcements];
};

export const listNotificationsForUser = async (
  user: AuthPayload,
  limit?: number
): Promise<NotificationFeedItem[]> => {
  const resolvedLimit = clampLimit(limit);

  let items: NotificationFeedItem[];
  if (user.role === 'admin') {
    items = await getAdminNotifications();
  } else if (user.role === 'instructor') {
    items = await getInstructorNotifications(user.sub);
  } else {
    items = await getStudentNotifications(user.sub);
  }

  const visibleItems = items
    .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
    .slice(0, resolvedLimit);

  return withReadState(user.sub, visibleItems);
};
