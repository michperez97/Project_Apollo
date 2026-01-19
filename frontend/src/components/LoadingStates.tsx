export const Spinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-block border-2 border-current border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingCard = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="card flex flex-col items-center justify-center py-12 text-center">
    <Spinner size="lg" className="text-primary-600 mb-4" />
    <p className="text-gray-600">{message}</p>
  </div>
);

export const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton h-4 w-full" style={{ width: `${Math.random() * 30 + 70}%` }} />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="card">
    <div className="skeleton h-6 w-1/3 mb-4" />
    <SkeletonText lines={3} />
  </div>
);
