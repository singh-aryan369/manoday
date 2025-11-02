import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="relative">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'ta' | 'te' | 'kn')}
        className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="en">🇺🇸 {t('english')}</option>
        <option value="hi">🇮🇳 {t('hindi')}</option>
        <option value="ta">🇮🇳 {t('tamil')}</option>
        <option value="te">🇮🇳 {t('telugu')}</option>
        <option value="kn">🇮🇳 {t('kannada')}</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
