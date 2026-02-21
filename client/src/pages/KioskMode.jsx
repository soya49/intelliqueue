import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Toast from '../components/Toast';
import { tokenAPI } from '../services/api';

/**
 * QR Self Check-in Kiosk Mode — Full-screen dark theme, touch-friendly
 */
const KioskMode = ({ onExit }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleCheckIn = async () => {
    const id = tokenInput.trim();
    if (!id) return;
    setLoading(true);
    try {
      const resp = await tokenAPI.selfCheckIn(id);
      setResult(resp);
      setToast({ type: 'success', message: resp.message });
      setTimeout(() => { setResult(null); setTokenInput(''); }, 6000);
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || 'Check-in failed. Token not found.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">
            🏥 IntelliQueue
          </h1>
          <p className="text-xl text-blue-300 font-light">Self Check-in Kiosk</p>
        </div>

        {result ? (
          /* ✅ Success screen */
          <div className="bg-white rounded-3xl p-12 text-center shadow-2xl">
            <div className="text-7xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-green-700 mb-2">Welcome!</h2>
            <p className="text-xl text-slate-700 mb-1">{result.token?.userName}</p>
            <p className="text-lg text-slate-600">Token #{result.token?.queueNumber}</p>
            <p className="text-sm text-slate-500 capitalize mt-1">
              Service: {result.token?.serviceType}
            </p>
            {result.token?.assignedCounter && (
              <p className="mt-3 text-green-600 font-semibold text-lg">
                → Proceed to Counter {result.token.assignedCounter}
              </p>
            )}
            <div className="mt-6 text-sm text-slate-400">Auto-resetting in 6 seconds...</div>
          </div>
        ) : (
          /* 📱 Input screen */
          <div className="bg-white rounded-3xl p-10 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
              📱 Scan QR Code
            </h2>
            <p className="text-center text-slate-500 mb-8 text-sm">
              Or manually enter your Token ID below
            </p>

            {/* QR scanner placeholder */}
            <div className="mb-6 bg-slate-100 rounded-2xl p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto border-4 border-dashed border-slate-300 rounded-2xl flex items-center justify-center mb-3">
                  <span className="text-4xl">📷</span>
                </div>
                <p className="text-xs text-slate-400">Camera scan area (simulated)</p>
              </div>
            </div>

            {/* Manual input */}
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              placeholder="Enter Token ID..."
              className="w-full px-6 py-5 text-xl text-center rounded-2xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono tracking-wider"
              autoFocus
            />

            <button
              onClick={handleCheckIn}
              disabled={loading || !tokenInput.trim()}
              className="w-full mt-4 py-5 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-40 shadow-lg"
            >
              {loading ? '⏳ Checking in...' : '✅ Check In'}
            </button>

            {/* Info */}
            <div className="mt-6 bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-800">
                💡 Your Token ID was provided when you booked your token.
                <br />Check your SMS or booking confirmation.
              </p>
            </div>
          </div>
        )}

        {/* Exit kiosk */}
        <button
          onClick={onExit}
          className="mt-8 mx-auto block text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          ✕ Exit Kiosk Mode
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default KioskMode;
