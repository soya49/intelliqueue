import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

/**
 * Demand Forecast Prediction Chart — AreaChart with predicted vs actual demand
 */
const ForecastChart = ({ forecast, currentHour, peakPrediction }) => {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={forecast} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
            formatter={(val, name) => [val ?? '—', name]}
          />
          {currentHour && (
            <ReferenceLine
              x={`${currentHour}:00`}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: 'Now', fill: '#ef4444', fontSize: 11 }}
            />
          )}
          <Area
            type="monotone" dataKey="predicted"
            stroke="#6366f1" strokeWidth={2}
            fill="url(#gradPredicted)" name="Predicted"
          />
          <Area
            type="monotone" dataKey="actual"
            stroke="#22c55e" strokeWidth={2}
            fill="url(#gradActual)" name="Actual"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Peak prediction callout */}
      {peakPrediction && (
        <div className="mt-3 flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-2 text-sm">
          <span className="text-lg">📈</span>
          <div>
            <span className="font-semibold text-indigo-700">Peak Predicted: </span>
            <span className="text-slate-700">
              {peakPrediction.label} (~{peakPrediction.predicted} tokens)
            </span>
            {peakPrediction.confidence && (
              <span className="text-xs text-slate-500 ml-2">
                {peakPrediction.confidence}% confidence
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastChart;
