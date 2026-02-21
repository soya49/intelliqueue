import React from 'react';

export const ProgressBar = ({
  value = 0,
  max = 100,
  label,
  showPercentage = true,
  animated = true,
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));

  const heightClass = { sm: 'h-2', md: 'h-3', lg: 'h-5' }[size] || 'h-3';

  const getGradient = () => {
    if (percentage >= 75) return 'from-green-400 to-emerald-500';
    if (percentage >= 50) return 'from-blue-400 to-blue-600';
    if (percentage >= 25) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-bold text-slate-900">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full ${heightClass} overflow-hidden`}>
        <div
          className={`${heightClass} rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-700 ease-out ${animated ? 'relative overflow-hidden' : ''}`}
          style={{ width: `${percentage}%` }}
        >
          {animated && percentage > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
