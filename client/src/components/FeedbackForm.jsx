import React, { useState } from 'react';
import { Star } from 'lucide-react';
import Toast from './Toast';

/**
 * Customer Satisfaction Feedback with star rating
 */
const FeedbackForm = ({ branchId, tokenId, userName, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setToast({ type: 'error', message: 'Please select a rating' });
      return;
    }
    try {
      await onSubmit({ branchId, tokenId, rating, comment, userName: userName || 'Anonymous' });
      setSubmitted(true);
      setToast({ type: 'success', message: 'Thank you for your feedback!' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to submit feedback' });
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <p className="text-lg font-bold text-slate-900">Thank you!</p>
        <p className="text-sm text-slate-600">Your feedback helps us improve.</p>
        <div className="flex justify-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={20} fill={rating >= s ? '#f59e0b' : 'none'} stroke={rating >= s ? '#f59e0b' : '#e5e7eb'} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-semibold text-slate-800 mb-3">⭐ Rate Your Experience</h4>
      {/* Star rating */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-125"
          >
            <Star
              size={34}
              fill={(hoverRating || rating) >= s ? '#f59e0b' : 'none'}
              stroke={(hoverRating || rating) >= s ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={2}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-slate-500">{rating}/5</span>
        )}
      </div>
      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience (optional)..."
        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none text-sm resize-none"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        className="mt-3 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium btn-hover shadow-md"
      >
        Submit Feedback
      </button>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default FeedbackForm;
