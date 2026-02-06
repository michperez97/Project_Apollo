import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCertificate, Certificate } from '../services/certificates';
import { LoadingCard } from '../components/LoadingStates';
import { Alert } from '../components/Alerts';

const CertificatePage = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!certificateId) return;
      setLoading(true);
      setError(null);
      try {
        const cert = await getCertificate(Number(certificateId));
        setCertificate(cert);
      } catch (err) {
        console.error(err);
        setError('Failed to load certificate.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [certificateId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingCard />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!certificate) return <Alert type="error">Certificate not found</Alert>;

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <button onClick={handlePrint} className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Certificate
          </button>
        </div>

        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-12 shadow-2xl print:shadow-none print:border-8">
          <div className="text-center mb-8">
            <div className="inline-block">
              <h1 className="text-5xl font-bold text-zinc-900 mb-2 txt-mono">APOLLO</h1>
              <div className="h-1 bg-acid" />
            </div>
          </div>

          <div className="text-center mb-12">
            <p className="txt-label mb-4">CERTIFICATE OF COMPLETION</p>
            <h2 className="text-3xl font-bold text-zinc-900 mb-8">
              {certificate.student_first_name} {certificate.student_last_name}
            </h2>
            <p className="text-lg text-zinc-600 mb-2">has successfully completed</p>
            <h3 className="text-2xl font-bold text-zinc-900">{certificate.course_title}</h3>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
            <div className="text-center">
              <p className="txt-label mb-2">COMPLETED ON</p>
              <p className="text-lg font-semibold text-zinc-900">
                {new Date(certificate.completed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="text-center">
              <p className="txt-label mb-2">ISSUED ON</p>
              <p className="text-lg font-semibold text-zinc-900">
                {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="border-t-2 border-zinc-200 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="txt-label mb-1">CERTIFICATE NUMBER</p>
                <p className="txt-mono text-sm text-zinc-700">{certificate.certificate_number}</p>
              </div>
              <div className="text-right">
                <div className="inline-block">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="status-dot acid" />
                    <p className="txt-label">VERIFIED</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Verify at apollo.com/verify/{certificate.certificate_number}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-zinc-200">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="h-px bg-zinc-900 w-48 mx-auto mb-2" />
                <p className="txt-label">COURSE INSTRUCTOR</p>
              </div>
              <div className="text-center">
                <div className="h-px bg-zinc-900 w-48 mx-auto mb-2" />
                <p className="txt-label">APOLLO DIRECTOR</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-zinc-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="txt-label">BLOCKCHAIN VERIFIED CREDENTIAL</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-zinc-500 print:hidden">
          <p>This certificate can be verified at any time using the certificate number above.</p>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
