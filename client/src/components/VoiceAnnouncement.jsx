import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Voice Announcement System — Web Speech API
 * Speaks status updates; supports multiple languages (en, hi, ml).
 */
const VoiceAnnouncement = ({ text, autoSpeak = false, language = 'en' }) => {
  const [enabled, setEnabled] = useState(false);
  const lastSpoken = useRef('');

  const langMap = { en: 'en-US', hi: 'hi-IN', ml: 'ml-IN' };

  const speak = useCallback((msg) => {
    if (!msg || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = langMap[language] || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    lastSpoken.current = msg;
  }, [language]);

  useEffect(() => {
    if (enabled && autoSpeak && text && text !== lastSpoken.current) {
      speak(text);
    }
  }, [text, enabled, autoSpeak, speak]);

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          if (next && text) speak(text);
          if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          enabled
            ? 'bg-indigo-100 text-indigo-700 shadow-sm'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
        title={enabled ? 'Disable voice announcements' : 'Enable voice announcements'}
      >
        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {enabled ? 'Voice On' : 'Voice Off'}
      </button>
      {enabled && text && (
        <button
          onClick={() => speak(text)}
          className="text-xs text-indigo-600 hover:underline"
        >
          🔊 Replay
        </button>
      )}
    </div>
  );
};

export default VoiceAnnouncement;
