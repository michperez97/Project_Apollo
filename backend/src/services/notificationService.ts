import { EnrollmentRecord, listPaidStudentsByCourse } from '../models/enrollmentModel';
import { CourseRecord, getCourseById } from '../models/courseModel';
import { findUserById } from '../models/userModel';
import { AnnouncementRecord } from '../models/announcementModel';
import { sendEmail } from './emailService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CURRENCY = (process.env.STRIPE_CURRENCY ?? 'usd').toUpperCase();

const courseLink = (courseId: number) => `${FRONTEND_URL}/course/${courseId}`;

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(amount);

const safeSend = async (label: string, payload: Parameters<typeof sendEmail>[0]) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.error(`Email failed (${label}):`, error);
  }
};

export const notifyEnrollmentCreated = async (enrollment: EnrollmentRecord) => {
  const [student, course] = await Promise.all([
    findUserById(enrollment.student_id),
    getCourseById(enrollment.course_id)
  ]);

  if (!student || !course) {
    return;
  }

  const isPaid = enrollment.payment_status === 'paid';
  const subject = isPaid
    ? `Enrollment confirmed: ${course.title}`
    : `Enrollment started: ${course.title}`;
  const statusLine = isPaid
    ? 'Your enrollment is active.'
    : 'Your enrollment is pending payment.';
  const link = courseLink(course.id);

  await safeSend('enrollment', {
    to: student.email,
    subject,
    text: [
      `Hi ${student.first_name},`,
      '',
      statusLine,
      `Course: ${course.title}`,
      `Access: ${link}`,
      '',
      'Thanks,',
      'Apollo Learning'
    ].join('\n'),
    html: [
      `<p>Hi ${student.first_name},</p>`,
      `<p>${statusLine}</p>`,
      `<p><strong>Course:</strong> ${course.title}</p>`,
      `<p><a href="${link}">Open course</a></p>`,
      `<p>Thanks,<br/>Apollo Learning</p>`
    ].join('')
  });
};

export const notifyPaymentSucceeded = async (params: {
  studentId: number;
  course: CourseRecord;
  amount: number;
}) => {
  const student = await findUserById(params.studentId);
  if (!student) {
    return;
  }

  const link = courseLink(params.course.id);
  const amountText = formatAmount(params.amount);

  await safeSend('payment', {
    to: student.email,
    subject: `Payment received: ${params.course.title}`,
    text: [
      `Hi ${student.first_name},`,
      '',
      `We received your payment of ${amountText}.`,
      `Course: ${params.course.title}`,
      `Access: ${link}`,
      '',
      'Thanks,',
      'Apollo Learning'
    ].join('\n'),
    html: [
      `<p>Hi ${student.first_name},</p>`,
      `<p>We received your payment of <strong>${amountText}</strong>.</p>`,
      `<p><strong>Course:</strong> ${params.course.title}</p>`,
      `<p><a href="${link}">Open course</a></p>`,
      `<p>Thanks,<br/>Apollo Learning</p>`
    ].join('')
  });
};

export const notifyRefund = async (params: {
  studentId: number;
  course: CourseRecord;
  amount: number;
}) => {
  const student = await findUserById(params.studentId);
  if (!student) {
    return;
  }

  const link = courseLink(params.course.id);
  const amountText = formatAmount(params.amount);

  await safeSend('refund', {
    to: student.email,
    subject: `Refund processed: ${params.course.title}`,
    text: [
      `Hi ${student.first_name},`,
      '',
      `A refund of ${amountText} has been processed.`,
      `Course: ${params.course.title}`,
      `Access: ${link}`,
      '',
      'Thanks,',
      'Apollo Learning'
    ].join('\n'),
    html: [
      `<p>Hi ${student.first_name},</p>`,
      `<p>A refund of <strong>${amountText}</strong> has been processed.</p>`,
      `<p><strong>Course:</strong> ${params.course.title}</p>`,
      `<p><a href="${link}">Open course</a></p>`,
      `<p>Thanks,<br/>Apollo Learning</p>`
    ].join('')
  });
};

export const notifyAnnouncement = async (announcement: AnnouncementRecord) => {
  const [course, students] = await Promise.all([
    getCourseById(announcement.course_id),
    listPaidStudentsByCourse(announcement.course_id)
  ]);

  if (!course || students.length === 0) {
    return;
  }

  const link = courseLink(course.id);
  const subject = `New update in ${course.title}: ${announcement.title}`;

  const sends = students.map((student) =>
    safeSend('announcement', {
      to: student.email,
      subject,
      text: [
        `Hi ${student.first_name},`,
        '',
        `There is a new update in ${course.title}.`,
        `Title: ${announcement.title}`,
        `Message: ${announcement.message}`,
        `View course: ${link}`,
        '',
        'Thanks,',
        'Apollo Learning'
      ].join('\n'),
      html: [
        `<p>Hi ${student.first_name},</p>`,
        `<p>There is a new update in <strong>${course.title}</strong>.</p>`,
        `<p><strong>${announcement.title}</strong></p>`,
        `<p>${announcement.message}</p>`,
        `<p><a href="${link}">View course</a></p>`,
        `<p>Thanks,<br/>Apollo Learning</p>`
      ].join('')
    })
  );

  await Promise.allSettled(sends);
};

export const notifyCourseStatus = async (params: {
  course: CourseRecord;
  status: 'approved' | 'rejected';
  feedback?: string | null;
}) => {
  if (!params.course.instructor_id) {
    return;
  }

  const instructor = await findUserById(params.course.instructor_id);
  if (!instructor) {
    return;
  }

  const subject =
    params.status === 'approved'
      ? `Course approved: ${params.course.title}`
      : `Course rejected: ${params.course.title}`;

  const link = `${FRONTEND_URL}/instructor/courses`;
  const feedbackLine = params.feedback ? `Feedback: ${params.feedback}` : 'No feedback provided.';

  await safeSend('course-status', {
    to: instructor.email,
    subject,
    text: [
      `Hi ${instructor.first_name},`,
      '',
      `Your course "${params.course.title}" was ${params.status}.`,
      feedbackLine,
      `Manage course: ${link}`,
      '',
      'Thanks,',
      'Apollo Learning'
    ].join('\n'),
    html: [
      `<p>Hi ${instructor.first_name},</p>`,
      `<p>Your course "<strong>${params.course.title}</strong>" was ${params.status}.</p>`,
      `<p>${feedbackLine}</p>`,
      `<p><a href="${link}">Manage course</a></p>`,
      `<p>Thanks,<br/>Apollo Learning</p>`
    ].join('')
  });
};
