import React from 'react';

const statusConfig = {
  waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  serving: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-500' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-500' },
  'no-show': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500' },
  arrived: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
};

const priorityConfig = {
  emergency: { bg: 'bg-red-100', text: 'text-red-700', icon: '🚨' },
  senior: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👴' },
  normal: { bg: 'bg-slate-100', text: 'text-slate-600', icon: '' },
};

export const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.waiting;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  if (!priority || priority === 'normal') return null;
  const cfg = priorityConfig[priority] || priorityConfig.normal;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.icon} {priority.toUpperCase()}
    </span>
  );
};

export default StatusBadge;
