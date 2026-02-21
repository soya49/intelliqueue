import React from 'react';
import { LANGUAGES } from '../services/i18n';

const LanguageSelector = ({ current, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-lg border border-slate-200 p-1">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            current === lang.code
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title={lang.label}
        >
          {lang.flag} {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
