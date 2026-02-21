import React, { useContext, useState } from 'react';
import { tokenAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { PriorityBadge } from '../components/StatusBadge';
import { LanguageContext } from '../App';

const Home = ({ onTokenBooked, onTimeSlot }) => {
  const { t: tr } = useContext(LanguageContext);

  const [formData, setFormData] = React.useState({
    branchId: '',
    serviceType: '',
    userName: '',
    userPhone: '',
    priority: 'normal',
  });
  const [branches, setBranches] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [groupMode, setGroupMode] = useState(false);
  const [groupMembers, setGroupMembers] = useState([{ name: '', phone: '' }]);

  React.useEffect(() => {
    // Mock data - In production, fetch from API
    setBranches([
      { id: 'branch1', name: 'Main Hospital - Cardiology' },
      { id: 'branch2', name: 'Main Hospital - General' },
      { id: 'branch3', name: 'Downtown Bank Branch' },
      { id: 'branch4', name: 'City Government Office' },
    ]);

    setServices([
      { id: 'consultation', name: 'Consultation' },
      { id: 'checkup', name: 'Medical Checkup' },
      { id: 'processing', name: 'Document Processing' },
      { id: 'payment', name: 'Payment & Billing' },
      { id: 'registration', name: 'Registration' },
    ]);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.branchId || !formData.serviceType || !formData.userName) {
      setToast({
        type: 'error',
        message: 'Please fill in all required fields',
      });
      return;
    }

    setLoading(true);
    try {
      let response;

      if (groupMode) {
        // Group Booking — book multiple members at once
        const validMembers = groupMembers
          .filter(m => m.name.trim())
          .map(m => ({ name: m.name.trim(), phone: m.phone || 'N/A' }));

        if (validMembers.length === 0) {
          setToast({ type: 'error', message: 'Add at least one member name' });
          setLoading(false);
          return;
        }
        response = await tokenAPI.groupBook(
          formData.branchId, formData.serviceType, validMembers, formData.priority
        );
        if (response.success) {
          setToast({
            type: 'success',
            message: `Group of ${validMembers.length} booked! Group ID: ${response.groupId}`,
          });
          // Navigate to first token's queue view
          onTokenBooked(response.tokens[0]);
          setGroupMembers([{ name: '', phone: '' }]);
          setGroupMode(false);
        }
      } else {
        // Single Booking
        response = await tokenAPI.bookToken(
        formData.branchId,
        formData.serviceType,
        formData.userName,
        formData.userPhone,
        formData.priority
      );

      if (response.success) {
        setToast({
          type: 'success',
          message: `Token #${response.token.queueNumber} booked successfully!${response.token.priority !== 'normal' ? ` (${response.token.priority.toUpperCase()} priority)` : ''}`,
        });

        // Call parent callback with token information
        onTokenBooked(response.token);

        // Reset form
        setFormData({
          branchId: '',
          serviceType: '',
          userName: '',
          userPhone: '',
          priority: 'normal',
        });
      }
      } // end else (single booking)
    } catch (error) {
      setToast({
        type: 'error',
        message: error.message || 'Failed to book token',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Gradient Header */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium mb-4">
            {tr('smartQueue')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            {tr('appName')}
          </h1>
          <p className="text-lg text-slate-600">
            {tr('tagline')}
          </p>
        </div>

        {/* Booking Card — glassmorphism */}
        <div className="glass rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Book Your Token</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Branch <span className="text-red-500">*</span>
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choose a branch...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choose a service...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Phone Number <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="tel"
                name="userPhone"
                value={formData.userPhone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                {tr('priority')}
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="normal">{tr('normal')}</option>
                <option value="senior">{tr('senior')}</option>
                <option value="emergency">{tr('emergency')}</option>
              </select>
              {formData.priority !== 'normal' && (
                <div className="mt-2">
                  <PriorityBadge priority={formData.priority} />
                </div>
              )}
            </div>

            {/* Group Booking Toggle */}
            <div className="border-t border-slate-200 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupMode}
                  onChange={(e) => {
                    setGroupMode(e.target.checked);
                    if (!e.target.checked) setGroupMembers([{ name: '', phone: '' }]);
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-semibold text-slate-700">👨‍👩‍👧‍👦 {tr('groupBooking')}</span>
              </label>
              {groupMode && (
                <div className="mt-3 space-y-2 pl-7">
                  {groupMembers.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...groupMembers];
                          updated[i].name = e.target.value;
                          setGroupMembers(updated);
                        }}
                        placeholder={`${tr('name')} ${i + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      <input
                        type="tel"
                        value={m.phone}
                        onChange={(e) => {
                          const updated = [...groupMembers];
                          updated[i].phone = e.target.value;
                          setGroupMembers(updated);
                        }}
                        placeholder={tr('phone')}
                        className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                      {groupMembers.length > 1 && (
                        <button type="button" onClick={() => setGroupMembers(groupMembers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGroupMembers([...groupMembers, { name: '', phone: '' }])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + {tr('addMember')}
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 btn-hover"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Booking...
                </>
              ) : groupMode ? (
                `👨‍👩‍👧‍👦 ${tr('bookGroup')} (${groupMembers.filter(m => m.name.trim()).length})`
              ) : (
                tr('bookBtn')
              )}
            </button>

            {/* Time Slot Booking shortcut */}
            {onTimeSlot && (
              <button
                type="button"
                onClick={onTimeSlot}
                className="w-full py-3 bg-white border-2 border-indigo-200 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-all"
              >
                {tr('bookBySlot')}
              </button>
            )}
          </form>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ How it works:</strong> Book your token, get a QR code, and track your
              position in real-time with estimated wait times!
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">⏱️</div>
            <h3 className="font-bold text-slate-900 mb-2">Smart Predictions</h3>
            <p className="text-sm text-slate-600">
              AI-powered wait time estimates using historical data
            </p>
          </div>

          <div className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-bold text-slate-900 mb-2">QR Code Check-in</h3>
            <p className="text-sm text-slate-600">
              Fast, contactless token verification with QR codes
            </p>
          </div>

          <div className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="font-bold text-slate-900 mb-2">Real-time Sync</h3>
            <p className="text-sm text-slate-600">
              Instant updates on your position and service status
            </p>
          </div>
        </div>
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

export default Home;
