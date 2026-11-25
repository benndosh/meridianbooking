import React, { useState } from 'react';
import { Building2, UserRound } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackType?: 'doctor' | 'facility';
  fallbackLabel?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'doctor',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ${className}`}
      >
        {fallbackType === 'doctor' ? (
          <UserRound className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        ) : (
          <Building2 className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        )}
        {fallbackLabel && (
          <span className="mt-2 px-3 text-center text-xs font-medium text-slate-600">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
