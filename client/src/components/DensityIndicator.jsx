import React from 'react';
import { Activity } from 'lucide-react';

const densityConfig = {
  LOW: {
    bg: 'bg-green-500',
    text: 'text-green-800',
    lightBg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Low Traffic',
  },
  MEDIUM: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-800',
    lightBg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Moderate Traffic',
  },
  HIGH: {
    bg: 'bg-red-500',
    text: 'text-red-800',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Heavy Traffic',
  },
};

export const DensityIndicator = ({ level, ratio, size = 'md' }) => {
  const cfg = densityConfig[level] || densityConfig.LOW;

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white ${cfg.bg}`}
      >
        <Activity size={12} />
        {level}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${cfg.lightBg} ${cfg.border}`}
    >
      <div className={`w-3 h-3 rounded-full ${cfg.bg} animate-pulse`} />
      <div>
        <p className={`text-sm font-bold ${cfg.text}`}>{level}</p>
        <p className="text-xs text-slate-500">
          {cfg.label}
          {ratio ? ` (${ratio})` : ''}
        </p>
      </div>
    </div>
  );
};

export default DensityIndicator;
