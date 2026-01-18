import { getCourseById } from '../models/courseModel';
import {
  EnrollmentInput,
  EnrollmentRecord,
  createEnrollment,
  listEnrollments,
  listEnrollmentsByStudent
} from '../models/enrollmentModel';

export const calculateTuition = async (courseId: number): Promise<number> => {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  return Number(course.credit_hours) * Number(course.price_per_credit);
};

export const enrollStudent = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentRecord> => {
  const tuition = await calculateTuition(courseId);
  const input: EnrollmentInput = {
    student_id: studentId,
    course_id: courseId,
    tuition_amount: tuition
  };
  return createEnrollment(input);
};

export const getEnrollments = async (studentId?: number): Promise<EnrollmentRecord[]> => {
  if (studentId) {
    return listEnrollmentsByStudent(studentId);
  }
  return listEnrollments();
};


