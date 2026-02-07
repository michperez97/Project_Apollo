import { getEnrollmentByStudentAndCourse } from '../models/enrollmentModel';
import { findUserById } from '../models/userModel';
import { UserRecord } from '../types/user';

export type CourseAccessSource = 'enrollment' | 'subscription' | 'none';

export interface CourseAccessResult {
  hasAccess: boolean;
  source: CourseAccessSource;
}

const isSubscriptionActive = (user: Pick<UserRecord, 'subscription_status' | 'current_period_end'>): boolean => {
  if (user.subscription_status !== 'active') {
    return false;
  }

  if (!user.current_period_end) {
    return true;
  }

  return new Date(user.current_period_end).getTime() > Date.now();
};

export const getStudentCourseAccess = async (
  studentId: number,
  courseId: number
): Promise<CourseAccessResult> => {
  const enrollment = await getEnrollmentByStudentAndCourse(studentId, courseId);
  if (enrollment && enrollment.payment_status === 'paid') {
    return { hasAccess: true, source: 'enrollment' };
  }

  const user = await findUserById(studentId);
  if (user && isSubscriptionActive(user)) {
    return { hasAccess: true, source: 'subscription' };
  }

  return { hasAccess: false, source: 'none' };
};

export const hasActiveSubscription = isSubscriptionActive;

