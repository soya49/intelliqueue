import React, { useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { tokenAPI } from '../services/api';
import { initializeSocket, joinBranch, onQueueUpdated, offQueueUpdated } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import DensityIndicator from '../components/DensityIndicator';
import ProgressBar from '../components/ProgressBar';
import VoiceAnnouncement from '../components/VoiceAnnouncement';
import IndoorMap from '../components/IndoorMap';
import FeedbackForm from '../components/FeedbackForm';
import { LanguageContext } from '../App';

/** Play a short beep using Web Audio API */
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const LiveQueue = ({ tokenId, branchId, onBackClick }) => {
  const { lang, t: tr } = useContext(LanguageContext);
  const [token, setToken] = React.useState(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = React.useState(null);
  const [position, setPosition] = React.useState(null);
  const [totalInQueue, setTotalInQueue] = React.useState(0);
  const [crowdDensity, setCrowdDensity] = React.useState(null);
  const [counters, setCounters] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState(null);
  const notifiedRef = React.useRef(false);
  const hasPlayedBeep = React.useRef(false);

  React.useEffect(() => {
    // Initialize socket connection
    initializeSocket();
    joinBranch(branchId);

    // Fetch token details
    const fetchToken = async () => {
      try {
        const response = await tokenAPI.getTokenDetails(tokenId);
        setToken(response.token);
        setEstimatedWaitTime(response.estimatedWaitTime);
        setPosition(response.position);
        setTotalInQueue(response.totalInQueue || 0);
        setCrowdDensity(response.crowdDensity || null);
      } catch (error) {
        setToast({
          type: 'error',
          message: error.message || 'Failed to fetch token details',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchToken();

    // Fetch counter data for indoor map
    tokenAPI.getCounters(branchId).then(r => {
      if (r.counters) setCounters(r.counters);
    }).catch(() => {});

    // Listen for real-time updates
    const handleQueueUpdate = (data) => {
      if (data.action === 'tokenStatusUpdated' && data.tokenId === tokenId) {
        setToken(data.token);
        if (data.status === 'completed') {
          setToast({
            type: 'success',
            message: 'Your service is complete!',
          });
        } else if (data.status === 'serving') {
          setToast({
            type: 'info',
            message: 'Your service is starting now!',
          });
        }
      }
      // Refresh queue data on any update
      fetchToken();
    };

    onQueueUpdated(handleQueueUpdate);

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchToken, 10000);

    return () => {
      clearInterval(interval);
      offQueueUpdated(handleQueueUpdate);
    };
  }, [tokenId, branchId]);

  // --- Smart Notification: when turn is near (position <= 2) ---
  React.useEffect(() => {
    if (position !== null && position > 0 && position <= 2 && token?.status === 'waiting') {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        setToast({
          type: 'info',
          message: `\ud83d\udd14 Your turn is coming in ~${estimatedWaitTime || 5} minutes!`,
        });
        // Simulate SMS notification
        console.log(`[SMS SIMULATION] To ${token.userPhone}: Dear ${token.userName}, your turn is coming in ~${estimatedWaitTime || 5} minutes at ${token.serviceType}. Please be ready!`);
      }
    }
    // Sound + flash when position <= 1
    if (position !== null && position <= 1 && token?.status === 'waiting' && !hasPlayedBeep.current) {
      hasPlayedBeep.current = true;
      playBeep();
    }
  }, [position, token?.status, estimatedWaitTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner message="Loading your token..." />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">Token not found</p>
          <button
            onClick={onBackClick}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage =
    token.status === 'completed' ? 100
    : token.status === 'serving' ? 90
    : position <= 0 ? 90
    : Math.max(10, Math.round((1 - (position - 1) / Math.max(1, totalInQueue)) * 80) + 10);

  // Should we flash the card? (position <= 1 and still waiting)
  const shouldFlash = position !== null && position <= 1 && token.status === 'waiting';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{tr('queueStatus')}</h1>
            {crowdDensity && (
              <div className="mt-2">
                <DensityIndicator level={crowdDensity.level} ratio={crowdDensity.ratio} size="sm" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <VoiceAnnouncement
              text={
                token?.status === 'completed'
                  ? `Your service is complete. Thank you ${token.userName}`
                  : token?.status === 'serving'
                    ? `Token number ${token.queueNumber}. Your service is starting now.`
                    : position <= 1
                      ? `Attention ${token?.userName}. You are next. Please proceed to the counter.`
                      : `Token ${token?.queueNumber}. ${position} people ahead. Estimated wait ${estimatedWaitTime} minutes.`
              }
              autoSpeak={true}
              language={lang}
            />
            <button
              onClick={onBackClick}
              className="px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ← {tr('back')}
            </button>
          </div>
        </div>

        {/* QR Code Card — glassmorphism + conditional flash */}
        <div className={`glass rounded-3xl shadow-lg p-8 mb-6 border-2 ${shouldFlash ? 'animate-flash-border' : 'border-transparent'}`}>
          <h2 className="text-center text-xl font-semibold text-slate-700 mb-6">
            Your QR Code
          </h2>
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
              <QRCodeSVG value={token.qrCodeValue} size={256} level="H" includeMargin={true} />
            </div>
          </div>
          <p className="text-center text-sm text-slate-600">
            Show this code at the counter or let the staff scan it
          </p>
        </div>

        {/* Token Info Card — glassmorphism */}
        <div className={`glass rounded-3xl shadow-lg p-8 mb-6 border-2 ${shouldFlash ? 'animate-flash-border' : 'border-transparent'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Queue Number */}
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Token Number</p>
              <p className="text-4xl font-bold text-blue-600">#{token.queueNumber}</p>
              {token.priority && token.priority !== 'normal' && (
                <div className="mt-1">
                  <PriorityBadge priority={token.priority} />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Status</p>
              <StatusBadge status={token.status} />
            </div>

            {/* Position */}
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Position</p>
              <div className="flex items-center justify-center gap-2">
                <Users size={20} className="text-slate-600" />
                <p className="text-2xl font-bold text-slate-900">#{position}</p>
              </div>
            </div>

            {/* Wait Time */}
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Est. Wait</p>
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} className="text-slate-600" />
                <p className="text-2xl font-bold text-slate-900">{estimatedWaitTime} min</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="border-t border-slate-200 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Name</p>
                <p className="font-semibold text-slate-900">{token.userName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Service Type</p>
                <p className="font-semibold text-slate-900 capitalize">{token.serviceType}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar — using reusable component */}
        <div className="glass rounded-3xl shadow-lg p-8 border-2 border-transparent">
          <ProgressBar
            value={progressPercentage}
            max={100}
            label="Queue Progress"
            showPercentage={true}
            animated={true}
            size="lg"
          />
          <p className="text-center text-sm text-slate-600 mt-4">
            {token.status === 'completed'
              ? '\u2713 Your service is complete!'
              : token.status === 'serving'
                ? '\ud83d\udfe2 Your service is in progress...'
                : position <= 1
                  ? '\ud83d\udd14 You are next! Please be ready.'
                  : `${position - 1} people ahead of you`}
          </p>
        </div>

        {/* Info Message */}
        {token.status === 'waiting' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Keep your device open or take a screenshot of this page.
              You'll receive a notification when it's your turn!
            </p>
          </div>
        )}

        {/* Indoor Navigation Map */}
        {counters.length > 0 && token.status !== 'completed' && (
          <div className="mt-6">
            <IndoorMap counters={counters} assignedCounter={token.assignedCounter} />
          </div>
        )}

        {/* Assigned Counter / Seat Info */}
        {(token.assignedCounter || token.assignedSeat) && (
          <div className="mt-6 glass rounded-2xl p-4 flex items-center gap-4">
            {token.assignedCounter && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 font-bold">🏢 Counter:</span>
                <span className="font-semibold text-slate-900">{token.assignedCounterName || token.assignedCounter}</span>
              </div>
            )}
            {token.assignedSeat && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 font-bold">💺 Seat:</span>
                <span className="font-semibold text-slate-900">{token.assignedSeat}</span>
              </div>
            )}
          </div>
        )}

        {/* Customer Satisfaction Feedback — shown when service complete */}
        {token.status === 'completed' && (
          <div className="mt-6 glass rounded-3xl shadow-lg p-8">
            <FeedbackForm
              branchId={branchId}
              tokenId={tokenId}
              userName={token.userName}
              onSubmit={(data) => tokenAPI.submitFeedback(data)}
            />
          </div>
        )}
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

export default LiveQueue;
