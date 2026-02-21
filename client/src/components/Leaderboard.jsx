import React from 'react';
import ProgressBar from './ProgressBar';

/**
 * Admin Performance Leaderboard — ranks staff by performance score
 */
const Leaderboard = ({ leaderboard }) => {
  if (!leaderboard || leaderboard.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No performance data yet</p>;
  }

  const medals = ['🏆', '🥈', '🥉'];

  return (
    <div className="space-y-3">
      {leaderboard.map((staff, idx) => (
        <div
          key={staff.id}
          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${
            idx === 0
              ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm'
              : idx === 1
                ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'
                : 'bg-white/60 border-slate-200'
          }`}
        >
          {/* Rank / avatar */}
          <div className="text-3xl flex-shrink-0">
            {idx < 3 ? medals[idx] : staff.avatar}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900 truncate">{staff.name}</p>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{staff.role}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span>📋 {staff.tokensServed} served</span>
              <span>⏱️ {staff.avgServiceTime}m avg</span>
              <span>{staff.rating}</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={staff.performanceScore} max={100} />
            </div>
          </div>

          {/* Score */}
          <div className="text-right flex-shrink-0">
            <p className={`text-2xl font-bold ${
              staff.performanceScore >= 80 ? 'text-green-600'
                : staff.performanceScore >= 50 ? 'text-indigo-600'
                  : 'text-orange-600'
            }`}>{staff.performanceScore}%</p>
            <p className="text-xs text-slate-500">Score</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard;
