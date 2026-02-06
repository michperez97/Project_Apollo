import { api } from './http';

export interface Certificate {
  id: number;
  student_id: number;
  course_id: number;
  certificate_number: string;
  issued_at: string;
  completed_at: string;
  student_first_name?: string;
  student_last_name?: string;
  student_email?: string;
  course_title?: string;
  course_description?: string | null;
}

export interface CertificateVerification {
  valid: boolean;
  certificate?: {
    certificate_number: string;
    student_name: string;
    course_title: string;
    issued_at: string;
    completed_at: string;
  };
}

// Get all certificates for a student
export const getStudentCertificates = async (studentId: number): Promise<Certificate[]> => {
  const { data } = await api.get<{ certificates: Certificate[] }>(`/certificates/student/${studentId}`);
  return data.certificates;
};

// Get specific certificate
export const getCertificate = async (certificateId: number): Promise<Certificate> => {
  const { data } = await api.get<{ certificate: Certificate }>(`/certificates/${certificateId}`);
  return data.certificate;
};

// Verify certificate by number (public)
export const verifyCertificate = async (certificateNumber: string): Promise<CertificateVerification> => {
  const { data } = await api.get<CertificateVerification>(`/certificates/verify/${certificateNumber}`);
  return data;
};

// Generate certificate (admin/instructor)
export const generateCertificate = async (
  studentId: number,
  courseId: number,
  completedAt?: string
): Promise<Certificate> => {
  const { data } = await api.post<{ certificate: Certificate }>('/certificates/generate', {
    student_id: studentId,
    course_id: courseId,
    completed_at: completedAt
  });
  return data.certificate;
};

// Delete certificate (admin)
export const deleteCertificate = async (certificateId: number): Promise<void> => {
  await api.delete(`/certificates/${certificateId}`);
};
