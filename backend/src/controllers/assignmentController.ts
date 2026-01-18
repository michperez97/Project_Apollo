import { Response, NextFunction } from 'express';
import {
  createAssignment,
  createSubmission,
  deleteAssignment,
  getAssignmentById,
  listAssignmentsByCourse,
  listGradeAverages,
  listSubmissions,
  listSubmissionsByCourse,
  updateAssignment,
  gradeSubmission
} from '../models/assignmentModel';
import { AuthenticatedRequest } from '../types/auth';
import { isStaff } from '../types/assignment';

export const listAssignmentsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const assignments = await listAssignmentsByCourse(courseId);
    return res.json({ assignments });
  } catch (error) {
    return next(error);
  }
};

export const createAssignmentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const assignment = await createAssignment(courseId, req.user?.sub ?? null, req.body);
    return res.status(201).json({ assignment });
  } catch (error) {
    return next(error);
  }
};

export const updateAssignmentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = Number(req.params.id);
    const updated = await updateAssignment(assignmentId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    return res.json({ assignment: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteAssignmentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = Number(req.params.id);
    const deleted = await deleteAssignment(assignmentId);
    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const listSubmissionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = Number(req.params.id);
    const studentOnly = req.user && !isStaff(req.user.role);
    const submissions = await listSubmissions(assignmentId, studentOnly ? req.user?.sub : undefined);
    return res.json({ submissions });
  } catch (error) {
    return next(error);
  }
};

export const submitAssignmentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = Number(req.params.id);
    const { content_url, content_text, student_id } = req.body;
    if (!content_url && !content_text) {
      return res.status(400).json({ error: 'Submission content is required' });
    }

    const studentId = student_id ?? req.user?.sub;
    if (!studentId) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const submission = await createSubmission(assignmentId, Number(studentId), {
      content_url,
      content_text
    });
    return res.status(201).json({ submission });
  } catch (error) {
    return next(error);
  }
};

export const gradeSubmissionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const submissionId = Number(req.params.id);
    const { grade, feedback } = req.body;
    const updated = await gradeSubmission(submissionId, grade ?? null, feedback ?? null);
    if (!updated) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    return res.json({ submission: updated });
  } catch (error) {
    return next(error);
  }
};

export const gradebookHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const isStudent = req.user && !isStaff(req.user.role);
    const targetStudentId = isStudent ? req.user?.sub : req.query.studentId ? Number(req.query.studentId) : undefined;
    const submissions = await listSubmissionsByCourse(courseId, targetStudentId);
    const averages = await listGradeAverages(courseId);
    return res.json({ submissions, averages });
  } catch (error) {
    return next(error);
  }
};

export const gradebookCsvHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const submissions = await listSubmissionsByCourse(courseId);
    const lines = ['submission_id,assignment_id,student_id,grade,feedback,submitted_at'];
    submissions.forEach((s) => {
      lines.push(
        [
          s.id,
          s.assignment_id,
          s.student_id,
          s.grade ?? '',
          `"${(s.feedback ?? '').replace(/"/g, '""')}"`,
          s.submitted_at.toISOString()
        ].join(',')
      );
    });
    res.header('Content-Type', 'text/csv');
    res.attachment(`gradebook_course_${courseId}.csv`);
    return res.send(lines.join('\n'));
  } catch (error) {
    return next(error);
  }
};

