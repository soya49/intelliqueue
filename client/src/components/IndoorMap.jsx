import React from 'react';

/**
 * Indoor Navigation Map — SVG floor plan with animated path to assigned counter
 */
const IndoorMap = ({ counters, assignedCounter }) => {
  const entrance = { x: 350, y: 350 };
  const waitingAreaCenter = { x: 350, y: 240 };
  const assigned = counters?.find(c => c.id === assignedCounter);

  return (
    <div className="bg-white/60 rounded-2xl p-4 border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
        🗺️ Indoor Navigation
        {assigned && <span className="text-xs text-green-600 font-normal">→ {assigned.name}</span>}
      </h4>

      <svg viewBox="0 0 700 400" className="w-full h-auto" role="img" aria-label="Indoor floor plan">
        {/* Floor background */}
        <rect x="20" y="20" width="660" height="360" rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />

        {/* Waiting Area */}
        <rect x="180" y="170" width="340" height="100" rx="12" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="350" y="210" textAnchor="middle" fill="#3b82f6" fontSize="13" fontWeight="600">🪑 Waiting Area</text>
        {/* Seat rows */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} x={210 + i * 42} y={230} width="30" height="20" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.8" />
        ))}

        {/* Counter zone label */}
        <text x="350" y="42" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">COUNTER ZONE</text>

        {/* Counters */}
        {(counters || []).map((c) => (
          <g key={c.id}>
            <rect
              x={c.x - 42} y={c.y - 18}
              width="84" height="36"
              rx="8"
              fill={assignedCounter === c.id ? '#dcfce7' : '#f1f5f9'}
              stroke={assignedCounter === c.id ? '#22c55e' : '#cbd5e1'}
              strokeWidth={assignedCounter === c.id ? 2.5 : 1.5}
            />
            {assignedCounter === c.id && (
              <rect
                x={c.x - 42} y={c.y - 18}
                width="84" height="36"
                rx="8" fill="none"
                stroke="#22c55e" strokeWidth="3"
                opacity="0.6"
              >
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
            <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="bold">
              {c.name}
            </text>
          </g>
        ))}

        {/* Entrance */}
        <rect x={entrance.x - 35} y={entrance.y - 15} width="70" height="30" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={entrance.x} y={entrance.y + 5} textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="bold">🚪 Entry</text>

        {/* Navigation path (animated dashed line) */}
        {assigned && (
          <path
            d={`M ${entrance.x},${entrance.y - 15} L ${entrance.x},${waitingAreaCenter.y + 50} L ${assigned.x},${waitingAreaCenter.y + 50} L ${assigned.x},${assigned.y + 22}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeDasharray="10 5"
            strokeLinecap="round"
          >
            <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
          </path>
        )}

        {/* You Are Here indicator */}
        <circle cx={entrance.x} cy={entrance.y + 20} r="6" fill="#ef4444">
          <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <text x={entrance.x} y={entrance.y + 38} textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">YOU</text>
      </svg>

      {assigned ? (
        <p className="text-center text-sm font-medium text-green-700 mt-2">
          Follow the green path to <strong>{assigned.name}</strong>
        </p>
      ) : (
        <p className="text-center text-xs text-slate-400 mt-2">Counter will be assigned at booking</p>
      )}
    </div>
  );
};

export default IndoorMap;
