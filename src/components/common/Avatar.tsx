import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Avatar({
  src,
  name = 'User',
  size = 'md',
  isOnline = false,
  showStatus = false,
  className = '',
  onClick,
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-3.5 h-3.5 border-2',
    '2xl': 'w-5 h-5 border-2',
  };

  // Get 1 or 2 initials from name
  const initials = name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('') || '?';

  // Deterministic soft gradient background for user without image
  const charCode = name.charCodeAt(0) || 65;
  const gradientIndex = charCode % 5;
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-rose-600',
    'from-sky-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
  ];
  const gradient = gradients[gradientIndex];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${className}`}
    >
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white shadow-sm ${
          src ? 'bg-slate-200 dark:bg-slate-800' : `bg-gradient-to-tr ${gradient}`
        }`}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image and fallback to initials
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-slate-900 ${
            statusSizeClasses[size]
          } ${isOnline ? 'bg-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-400 dark:bg-slate-600'}`}
          title={isOnline ? 'Active now' : 'Offline'}
        />
      )}
    </div>
  );
}
