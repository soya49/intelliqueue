import React, { createContext, useState, useEffect } from 'react';
import Home from './pages/Home';
import LiveQueue from './pages/LiveQueue';
import AdminDashboard from './pages/AdminDashboard';
import KioskMode from './pages/KioskMode';
import TimeSlotBooking from './pages/TimeSlotBooking';
import LanguageSelector from './components/LanguageSelector';
import { t } from './services/i18n';
import { isOnline, onConnectivityChange } from './services/offlineQueue';

// ---- Contexts ----
export const LanguageContext = createContext({ lang: 'en', t: (key) => t('en', key) });
export const AuthContext = createContext({ role: 'user' });

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [bookingData, setBookingData] = useState(null);
  const [lang, setLang] = useState('en');
  const [role, setRole] = useState('user');
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    return onConnectivityChange((status) => setOnline(status));
  }, []);

  const tr = (key) => t(lang, key);

  const handleTokenBooked = (token) => {
    setBookingData(token);
    setCurrentPage('queue');
  };

  const handleBackClick = () => {
    setCurrentPage('home');
    setBookingData(null);
  };

  // Kiosk mode — full screen, no chrome
  if (currentPage === 'kiosk') {
    return <KioskMode onExit={() => setCurrentPage('home')} />;
  }

  // Time Slot Booking page
  if (currentPage === 'timeslot') {
    return (
      <TimeSlotBooking
        onBack={() => setCurrentPage('home')}
        onBooked={handleTokenBooked}
      />
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tr }}>
      <AuthContext.Provider value={{ role, setRole }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
          {/* Offline indicator */}
          {!online && (
            <div className="fixed top-0 inset-x-0 z-[9999] bg-orange-500 text-white text-center text-sm py-1.5 font-medium">
              📴 {tr('offline')} — requests will be synced when connectivity is restored
            </div>
          )}

          {currentPage === 'home' && (
            <Home
              onTokenBooked={handleTokenBooked}
              onTimeSlot={() => setCurrentPage('timeslot')}
            />
          )}

          {currentPage === 'queue' && bookingData && (
            <LiveQueue
              tokenId={bookingData.tokenId}
              branchId={bookingData.branchId}
              onBackClick={handleBackClick}
            />
          )}

          {currentPage === 'admin' && <AdminDashboard branchId="branch1" />}

          {/* ---- Bottom control bar ---- */}
          <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
            {/* Left: navigation buttons */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {currentPage === 'home' && (
                <>
                  <button
                    onClick={() => setCurrentPage('admin')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium shadow-lg"
                  >
                    🔧 {tr('adminPanel')}
                  </button>
                  <button
                    onClick={() => setCurrentPage('kiosk')}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-medium shadow-lg"
                  >
                    📱 {tr('kioskMode')}
                  </button>
                </>
              )}
              {currentPage === 'admin' && (
                <button
                  onClick={() => setCurrentPage('home')}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium shadow-lg"
                >
                  {tr('backToHome')}
                </button>
              )}
            </div>

            {/* Right: language + role selectors */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <LanguageSelector current={lang} onChange={setLang} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white/80 backdrop-blur text-xs font-medium text-slate-600"
                title="Role (simulated login)"
              >
                <option value="user">👤 User</option>
                <option value="staff">🧑‍⚕️ Staff</option>
                <option value="admin">🔑 Admin</option>
              </select>
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
};

export default App;
