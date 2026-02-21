import React, { useContext } from 'react';
import { Play, CheckCircle, Trash2, BarChart3, Activity, MapPin, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { tokenAPI } from '../services/api';
import { initializeSocket, joinBranch, onQueueUpdated, offQueueUpdated } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import DensityIndicator from '../components/DensityIndicator';
import ProgressBar from '../components/ProgressBar';
import Leaderboard from '../components/Leaderboard';
import ForecastChart from '../components/ForecastChart';
import SeatMap from '../components/SeatMap';
import TrafficLightBoard from '../components/TrafficLightBoard';
import { LanguageContext } from '../App';

const AdminDashboard = ({ branchId }) => {
  const { t: tr } = useContext(LanguageContext);
  const [activeBranch, setActiveBranch] = React.useState(branchId);
  const [tokens, setTokens] = React.useState([]);
  const [analytics, setAnalytics] = React.useState(null);
  const [crowdDensity, setCrowdDensity] = React.useState(null);
  const [heatMap, setHeatMap] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState(null);
  const [selectedService, setSelectedService] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('overview');

  // Advanced feature states
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [forecast, setForecast] = React.useState(null);
  const [seats, setSeats] = React.useState(null);
  const [trafficLights, setTrafficLights] = React.useState([]);
  const [weather, setWeather] = React.useState(null);
  const [feedbackStats, setFeedbackStats] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    if (!activeBranch) return;

    // Initialize socket
    initializeSocket();
    joinBranch(activeBranch);

    // Fetch initial data
    const fetchData = async () => {
      try {
        // Fetch queue status (now includes token list)
        const queueResponse = await tokenAPI.getQueueStatus(activeBranch, selectedService);
        setCrowdDensity(queueResponse.data.crowdDensity);
        setTokens(queueResponse.data.tokens || []);

        // Fetch analytics
        const analyticsResponse = await tokenAPI.getAnalytics(activeBranch);
        setAnalytics(analyticsResponse.analytics);

        // Fetch heat map data
        const heatMapResponse = await tokenAPI.getHeatMap(activeBranch);
        setHeatMap(heatMapResponse.heatMap);

        // Fetch advanced module data (non-blocking)
        Promise.allSettled([
          tokenAPI.getLeaderboard(activeBranch).then(r => setLeaderboard(r.leaderboard || [])),
          tokenAPI.getForecast(activeBranch).then(r => setForecast(r)),
          tokenAPI.getSeats(activeBranch).then(r => setSeats(r)),
          tokenAPI.getTrafficLight(activeBranch).then(r => setTrafficLights(r.lights || [])),
          tokenAPI.getWeather().then(r => setWeather(r)),
          tokenAPI.getFeedbackStats(activeBranch).then(r => setFeedbackStats(r)),
          tokenAPI.getNotifications().then(r => setNotifications(r.notifications || [])),
        ]).catch(() => {});

        setLoading(false);
      } catch (error) {
        setToast({
          type: 'error',
          message: error.message || 'Failed to fetch data',
        });
        setLoading(false);
      }
    };

    fetchData();

    // Listen for queue updates
    const handleQueueUpdate = (data) => {
      fetchData(); // Refresh data on any queue update
    };

    onQueueUpdated(handleQueueUpdate);

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(interval);
      offQueueUpdated(handleQueueUpdate);
    };
  }, [activeBranch, selectedService]);

  const handleTokenStatusUpdate = async (tokenId, status) => {
    try {
      await tokenAPI.updateTokenStatus(tokenId, status, activeBranch);
      setToast({
        type: 'success',
        message: `Token status updated to ${status}`,
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error.message || 'Failed to update token',
      });
    }
  };

  const handleCancelToken = async (tokenId) => {
    if (window.confirm('Are you sure you want to cancel this token?')) {
      try {
        await tokenAPI.cancelToken(tokenId);
        setToast({
          type: 'success',
          message: 'Token cancelled successfully',
        });
      } catch (error) {
        setToast({
          type: 'error',
          message: error.message || 'Failed to cancel token',
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Gradient Header with Branch Selector */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 mb-8 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{tr('adminDashboard')}</h1>
              <p className="text-blue-100">{tr('manageQueue')}</p>
            </div>
            <select
              value={activeBranch}
              onChange={(e) => { setActiveBranch(e.target.value); setLoading(true); }}
              className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur text-white border border-white/30 font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="branch1" className="text-slate-900">Main Hospital - Cardiology</option>
              <option value="branch2" className="text-slate-900">Main Hospital - General</option>
              <option value="branch3" className="text-slate-900">Downtown Bank Branch</option>
              <option value="branch4" className="text-slate-900">City Government Office</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: `📊 ${tr('overview')}` },
            { id: 'analytics', label: `📈 ${tr('analytics')}` },
            { id: 'operations', label: `⚙️ ${tr('operations')}` },
            { id: 'feedback', label: `💬 ${tr('feedback')}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white/70 text-slate-600 hover:bg-white border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ====== OVERVIEW TAB ====== */}
        {activeTab === 'overview' && (<>
        {/* Key Metrics — glassmorphism cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
          {/* Crowd Density */}
          {crowdDensity && (
            <div className="glass rounded-3xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Crowd Density</h3>
                <Activity className="text-slate-400" size={20} />
              </div>
              <DensityIndicator level={crowdDensity.level} ratio={crowdDensity.ratio} />
            </div>
          )}

          {/* Total Tokens Today */}
          {analytics && (
            <div className="glass rounded-3xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Tokens Today</h3>
                <BarChart3 className="text-blue-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalTokensToday}</p>
            </div>
          )}

          {/* Served Today */}
          {analytics && (
            <div className="glass rounded-3xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Served Today</h3>
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{analytics.servedToday || analytics.completedTokens}</p>
            </div>
          )}

          {/* Avg Service Time */}
          {analytics && (
            <div className="glass rounded-3xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Avg Service Time</h3>
                <TrendingUp className="text-indigo-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{analytics.averageServiceTime}m</p>
            </div>
          )}

          {/* No-Show Rate */}
          {analytics && (
            <div className="glass rounded-3xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">No-Show %</h3>
                <AlertTriangle className="text-orange-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{analytics.noShowPercentage || analytics.noShowRate}%</p>
              <p className="text-xs text-slate-500 mt-1">{analytics.noShowCount || 0} no-shows</p>
            </div>
          )}
        </div>

        {/* Analytics Charts — Side-by-side Bar + Line */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Hourly Traffic Bar Chart */}
            <div className="glass rounded-3xl shadow-lg p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Hourly Traffic</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {analytics.peakHour && analytics.peakHour.count > 0 && (
                <p className="text-sm text-slate-600 mt-3">
                  📊 <strong>Peak Hour:</strong> {analytics.peakHour.formattedHour} ({analytics.peakHour.count} tokens)
                </p>
              )}
            </div>

            {/* Wait Time Trend Line Chart */}
            <div className="glass rounded-3xl shadow-lg p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Wait Time Trend</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.waitTimeTrend || analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis unit="m" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgWaitTime"
                    name="Avg Wait (min)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    name="Tokens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-Service Average Wait Time */}
        {analytics && analytics.avgWaitPerService && (
          <div className="glass rounded-3xl shadow-lg p-8 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Average Wait by Service Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.avgWaitPerService.map((svc) => (
                <div key={svc.service} className="bg-white/60 rounded-2xl p-4 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 capitalize mb-1">{svc.service}</p>
                  <p className="text-2xl font-bold text-indigo-600">{svc.avgWaitTime}m</p>
                  <p className="text-xs text-slate-400">{svc.count} served</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== CROWD DENSITY HEAT MAP ====== */}
        {heatMap && (
          <div className="glass rounded-3xl shadow-lg p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="text-rose-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Crowd Density Heat Map</h2>
              {/* Overall badge */}
              <span
                className="ml-auto px-4 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: heatMap.overall.color }}
              >
                Overall: {heatMap.overall.level} ({heatMap.overall.total} active)
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-green-500" />
                <span className="text-slate-600">Low (0-1)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-yellow-500" />
                <span className="text-slate-600">Medium (2-4)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-red-500" />
                <span className="text-slate-600">High (5+)</span>
              </div>
            </div>

            {/* Zone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {heatMap.zones.map((zone) => (
                <div
                  key={zone.id}
                  className="relative overflow-hidden rounded-2xl border-2 p-5 transition-all hover:scale-[1.02]"
                  style={{ borderColor: zone.color + '60' }}
                >
                  {/* Glow background */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{zone.icon}</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: zone.color }}
                      >
                        {zone.level}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm mb-2">{zone.label}</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-3xl font-bold" style={{ color: zone.color }}>
                          {zone.total}
                        </p>
                        <p className="text-xs text-slate-500">in queue</p>
                      </div>
                      <div className="flex gap-2 text-xs mb-1">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          {zone.waiting} waiting
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          {zone.serving} serving
                        </span>
                      </div>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, zone.total * 10)}%`,
                          backgroundColor: zone.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hourly Heat Grid */}
            <h3 className="font-semibold text-slate-700 mb-3">Hourly Check-in Heat Grid</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-slate-500 pb-2 pr-4 min-w-[140px]">Zone</th>
                    {heatMap.hours.map((h) => (
                      <th key={h} className="text-center text-xs text-slate-500 pb-2 px-1 min-w-[44px]">
                        {h}:00
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatMap.hourlyGrid.map((row) => (
                    <tr key={row.zone}>
                      <td className="text-sm font-medium text-slate-700 py-1 pr-4">
                        {row.icon} {row.label}
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.hour} className="py-1 px-1">
                          <div
                            className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-110 cursor-default"
                            style={{ backgroundColor: cell.count === 0 ? '#e2e8f0' : cell.color }}
                            title={`${row.label} @ ${cell.hour}:00 — ${cell.count} tokens (${cell.level})`}
                          >
                            {cell.count > 0 ? cell.count : ''}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Queue Management */}
        <div className="glass rounded-3xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Active Queue</h2>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Filter by Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Services</option>
              <option value="consultation">Consultation</option>
              <option value="checkup">Medical Checkup</option>
              <option value="processing">Document Processing</option>
              <option value="payment">Payment & Billing</option>
            </select>
          </div>

          {/* Token List */}
          <div className="space-y-3">
            {tokens.length > 0 ? (
              tokens.map((token) => (
                <div
                  key={token.tokenId}
                  className="flex items-center justify-between bg-white/60 p-4 rounded-xl border border-slate-200 queue-item"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-blue-600">#{token.queueNumber}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{token.userName}</p>
                          <PriorityBadge priority={token.priority} />
                        </div>
                        <p className="text-sm text-slate-500">{token.serviceType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <StatusBadge status={token.status} />

                    {/* Action Buttons */}
                    {token.status === 'waiting' && (
                      <button
                        onClick={() => handleTokenStatusUpdate(token.tokenId, 'serving')}
                        className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg btn-hover"
                      >
                        <Play size={16} />
                        Start
                      </button>
                    )}

                    {token.status === 'serving' && (
                      <button
                        onClick={() => handleTokenStatusUpdate(token.tokenId, 'completed')}
                        className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg btn-hover"
                      >
                        <CheckCircle size={16} />
                        Complete
                      </button>
                    )}

                    {(token.status === 'waiting' || token.status === 'serving') && (
                      <button
                        onClick={() => handleCancelToken(token.tokenId)}
                        className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg btn-hover"
                      >
                        <Trash2 size={16} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600">No active tokens in queue</p>
              </div>
            )}
          </div>
        </div>
        </>)}

        {/* ====== ANALYTICS TAB ====== */}
        {activeTab === 'analytics' && (<>
          {/* Forecast Chart */}
          {forecast && (
            <div className="glass rounded-3xl shadow-lg p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">🔮 {tr('forecast')}</h2>
              <ForecastChart
                forecast={forecast.forecast}
                currentHour={forecast.currentHour}
                peakPrediction={forecast.peakPrediction}
              />
            </div>
          )}

          {/* Weather Impact Card */}
          {weather && (
            <div className="glass rounded-3xl shadow-lg p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">🌤️ {tr('weather')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-6 text-center border border-blue-100">
                  <div className="text-5xl mb-2">{weather.weather.icon}</div>
                  <p className="font-bold text-slate-900 text-lg">{weather.weather.label}</p>
                  <p className="text-sm text-slate-600 mt-1">{weather.weather.msg}</p>
                  <p className="text-xs text-slate-400 mt-2">Traffic impact: {weather.weather.impactPercent}%</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 text-center border border-orange-100">
                  <div className="text-5xl mb-2">⏰</div>
                  <p className="font-bold text-slate-900 text-lg">{weather.currentPeak.label}</p>
                  <p className="text-sm text-slate-600 mt-1">Multiplier: {weather.currentPeak.multiplier}x</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-100">
                  <div className="text-5xl mb-2">📋</div>
                  <p className="font-bold text-slate-900 text-lg">Capacity</p>
                  <p className="text-sm text-slate-600 mt-1">{weather.adjustedCapacity}% adjusted</p>
                  <p className="text-xs text-slate-500 mt-2">{weather.recommendation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Existing charts — display in analytics tab too */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-3xl shadow-lg p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{tr('hourlyTraffic')}</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tokens" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass rounded-3xl shadow-lg p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">{tr('waitTimeTrend')}</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={analytics.waitTimeTrend || analytics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis unit="m" />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgWaitTime" name="Avg Wait (min)" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="tokens" name="Tokens" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>)}

        {/* ====== OPERATIONS TAB ====== */}
        {activeTab === 'operations' && (<>
          {/* Traffic Light Board */}
          {trafficLights.length > 0 && (
            <div className="glass rounded-3xl shadow-lg p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">🚦 {tr('trafficLight')}</h2>
              <TrafficLightBoard lights={trafficLights} />
            </div>
          )}

          {/* Seat Map */}
          {seats && (
            <div className="glass rounded-3xl shadow-lg p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">💺 {tr('seatMap')}</h2>
              <SeatMap
                seats={seats.seats}
                total={seats.total}
                occupied={seats.occupied}
                available={seats.available}
                occupancyPercent={seats.occupancyPercent}
              />
            </div>
          )}

          {/* Performance Leaderboard */}
          <div className="glass rounded-3xl shadow-lg p-8 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">🏆 {tr('leaderboard')}</h2>
            <Leaderboard leaderboard={leaderboard} />
          </div>
        </>)}

        {/* ====== FEEDBACK TAB ====== */}
        {activeTab === 'feedback' && (<>
          {/* Feedback Stats */}
          {feedbackStats && (
            <div className="glass rounded-3xl shadow-lg p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">⭐ Customer Feedback</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 text-center border border-yellow-200">
                  <p className="text-4xl font-bold text-yellow-600">{feedbackStats.averageRating || '—'}</p>
                  <p className="text-sm text-slate-600 mt-1">Average Rating</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-lg ${s <= Math.round(feedbackStats.averageRating) ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border border-blue-200">
                  <p className="text-4xl font-bold text-blue-600">{feedbackStats.totalFeedbacks}</p>
                  <p className="text-sm text-slate-600 mt-1">Total Responses</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-6 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Distribution</p>
                  {(feedbackStats.distribution || []).reverse().map(d => (
                    <div key={d.rating} className="flex items-center gap-2 mb-1">
                      <span className="text-xs w-4">{d.rating}★</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: feedbackStats.totalFeedbacks > 0 ? `${(d.count / feedbackStats.totalFeedbacks) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-6 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent feedbacks */}
              {feedbackStats.recent && feedbackStats.recent.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3">Recent Feedback</h3>
                  <div className="space-y-2">
                    {feedbackStats.recent.map((fb, i) => (
                      <div key={i} className="bg-white/60 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-sm ${s <= fb.rating ? '' : 'opacity-20'}`}>⭐</span>
                          ))}
                        </div>
                        <p className="text-sm text-slate-700 flex-1">{fb.comment || '(No comment)'}</p>
                        <span className="text-xs text-slate-400">{fb.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Log */}
          <div className="glass rounded-3xl shadow-lg p-8 mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">📱 SMS / WhatsApp Log</h2>
            {notifications.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/60 rounded-xl p-3 border border-slate-200 text-sm">
                    <span className="text-lg flex-shrink-0">{n.type === 'SMS' ? '📱' : '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">{n.type}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-600">{n.to}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          n.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{n.status}</span>
                      </div>
                      <p className="text-slate-600 mt-1 truncate">{n.message}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No notifications sent yet. Book tokens to see SMS/WhatsApp logs.</p>
            )}
          </div>
        </>)}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
