import React, { useState, useEffect } from 'react';
import { tokenAPI } from '../services/api';
import Toast from '../components/Toast';

/**
 * Time Slot Booking System — book tokens for specific time windows
 */
const TimeSlotBooking = ({ onBack, onBooked }) => {
  const [branchId, setBranchId] = useState('branch1');
  const [serviceType, setServiceType] = useState('consultation');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const resp = await tokenAPI.getTimeSlots(branchId);
        setSlots(resp.slots || []);
      } catch (err) {
        console.error('Failed to load time slots', err);
      }
    };
    fetchSlots();
  }, [branchId]);

  const handleBook = async () => {
    if (!selectedSlot) {
      setToast({ type: 'error', message: 'Please select a time slot' });
      return;
    }
    if (!userName.trim()) {
      setToast({ type: 'error', message: 'Please enter your name' });
      return;
    }
    setLoading(true);
    try {
      const resp = await tokenAPI.bookToken(branchId, serviceType, userName, userPhone, priority);
      setToast({
        type: 'success',
        message: `✅ Booked for ${selectedSlot} — Token #${resp.token.queueNumber}`,
      });
      if (onBooked) onBooked(resp.token);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Booking failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 hover:bg-slate-50 transition-all"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">📅 Time Slot Booking</h1>
        </div>

        <div className="glass rounded-3xl shadow-xl p-8">
          {/* Branch & Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Branch</label>
              <select
                value={branchId} onChange={e => setBranchId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="branch1">Main Hospital — Cardiology</option>
                <option value="branch2">Main Hospital — General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Service</label>
              <select
                value={serviceType} onChange={e => setServiceType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="consultation">Consultation</option>
                <option value="checkup">Medical Checkup</option>
                <option value="processing">Document Processing</option>
                <option value="payment">Payment</option>
              </select>
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
              <input
                type="text" value={userName} onChange={e => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone (optional)</label>
              <input
                type="tel" value={userPhone} onChange={e => setUserPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
            <div className="flex gap-3">
              {[
                { value: 'normal', label: 'Normal', icon: '🙂' },
                { value: 'senior', label: 'Senior', icon: '👴' },
                { value: 'emergency', label: 'Emergency', icon: '🚨' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    priority === p.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots Grid */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Select Time Slot
              <span className="text-xs text-slate-400 font-normal ml-2">({slots.length} available)</span>
            </h3>
            {slots.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No more time slots available today</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`p-3 rounded-xl text-center border-2 transition-all ${
                      selectedSlot === slot.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <p className="text-sm font-bold">{slot.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{slot.available} left</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book button */}
          <button
            onClick={handleBook}
            disabled={loading || !selectedSlot || !userName.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl disabled:opacity-40 btn-hover shadow-lg text-lg"
          >
            {loading ? '⏳ Booking...' : selectedSlot ? `📅 Book for ${selectedSlot}` : 'Select a time slot'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TimeSlotBooking;
