import React from 'react';

/**
 * Traffic Light Queue Display Board
 * Shows red/yellow/green lights per service based on current wait time.
 */
const TrafficLightBoard = ({ lights }) => {
  if (!lights || lights.length === 0) return null;

  const colorCfg = {
    green:  { bg: 'bg-green-500', glow: 'shadow-green-400/60', text: 'text-green-700', emoji: '✅' },
    yellow: { bg: 'bg-yellow-400', glow: 'shadow-yellow-400/60', text: 'text-yellow-700', emoji: '⚠️' },
    red:    { bg: 'bg-red-500', glow: 'shadow-red-400/60', text: 'text-red-700', emoji: '🔴' },
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {lights.map(l => {
          const cfg = colorCfg[l.color] || colorCfg.green;
          return (
            <div key={l.service} className="text-center">
              {/* Traffic light housing */}
              <div className="bg-slate-800 rounded-2xl p-3 mx-auto w-16 flex flex-col items-center gap-2 shadow-lg">
                {['red', 'yellow', 'green'].map(c => (
                  <div
                    key={c}
                    className={`w-5 h-5 rounded-full transition-all duration-500 ${
                      l.color === c
                        ? `${colorCfg[c].bg} shadow-lg ${colorCfg[c].glow}`
                        : 'bg-slate-700 opacity-30'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-2 capitalize">{l.service}</p>
              <p className={`text-xs font-bold ${cfg.text}`}>{l.label}</p>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> &lt; 5 min</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> 5–15 min</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &gt; 15 min</span>
      </div>
    </div>
  );
};

export default TrafficLightBoard;
