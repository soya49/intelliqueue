import React from 'react';

/**
 * Waiting Area Seat Availability Map — visual grid showing occupied/available seats
 */
const SeatMap = ({ seats, total, occupied, available, occupancyPercent }) => {
  if (!seats) return null;

  const getOccupancyColor = (pct) => {
    if (pct >= 80) return 'text-red-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-400 border border-green-500" />
          <span className="text-xs text-slate-600">Available ({available})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-400 border border-red-500" />
          <span className="text-xs text-slate-600">Occupied ({occupied})</span>
        </div>
        <span className={`ml-auto text-sm font-bold ${getOccupancyColor(occupancyPercent)}`}>
          {occupancyPercent}% Full
        </span>
      </div>

      {/* Seat grid */}
      <div className="grid grid-cols-5 gap-2">
        {seats.map(seat => (
          <div
            key={seat.id}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all duration-300 cursor-default
              ${seat.occupied
                ? 'bg-red-100 text-red-600 border-2 border-red-300 shadow-inner'
                : 'bg-green-100 text-green-600 border-2 border-green-300 hover:bg-green-200 hover:shadow-md'
              }`}
            title={seat.occupied ? `Occupied — Token: ${seat.tokenId}` : `Seat ${seat.id} — Available`}
          >
            <span className="text-base">{seat.occupied ? '🧑' : '💺'}</span>
            <span className="text-[10px] mt-0.5">{seat.id}</span>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            occupancyPercent >= 80 ? 'bg-red-500' : occupancyPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${occupancyPercent}%` }}
        />
      </div>
    </div>
  );
};

export default SeatMap;
