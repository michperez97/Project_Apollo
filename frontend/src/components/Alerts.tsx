import { ReactNode } from 'react';

type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert = ({ type, message, onClose, className = '' }: AlertProps) => {
  const typeClasses = {
    error: 'alert-error',
    success: 'alert-success',
    info: 'alert-info',
    warning: 'alert-warning'
  };

  return (
    <div className={`alert ${typeClasses[type]} flex items-start justify-between gap-3 ${className}`}>
      <p className="flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 font-bold text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
};

interface ErrorBoundaryFallbackProps {
  error: Error;
  retry?: () => void;
}

export const ErrorFallback = ({ error, retry }: ErrorBoundaryFallbackProps) => (
  <div className="card max-w-2xl mx-auto my-8 text-center">
    <div className="text-red-600 text-5xl mb-4">⚠️</div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">{error.message || 'An unexpected error occurred'}</p>
    {retry && (
      <button className="btn-primary" onClick={retry}>
        Try again
      </button>
    )}
  </div>
);

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon = '📭', title, description, action }: EmptyStateProps) => (
  <div className="card text-center py-12">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-600 mb-4">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
