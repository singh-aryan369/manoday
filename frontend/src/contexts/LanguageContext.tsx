import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // Common
    'back_to_chat': 'Back to Chat',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'cancel': 'Cancel',
    'save': 'Save',
    'edit': 'Edit',
    'delete': 'Delete',
    'create': 'Create',
    'update': 'Update',
    'yes': 'Yes',
    'no': 'No',
    
    // Dashboard
    'mood_dashboard': 'Mood Dashboard',
    'mental_wellness_insights': 'Your mental wellness insights at a glance',
    'todays_wri': "Today's WRI",
    'band': 'Band',
    'insight': 'INSIGHT',
    'band_explanation': 'BAND EXPLANATION',
    'trend': 'TREND',
    'top_contributors': 'Top Contributors',
    'wri_trend': 'WRI Trend (Last 30 Entries)',
    'screening_flags': 'Screening Flags',
    'personalized_recommendations': 'Personalized Recommendations',
    'depression': 'Depression',
    'anxiety': 'Anxiety',
    'burnout_strain': 'Burnout Strain',
    'social_isolation': 'Social Isolation',
    'help_readiness': 'Help Readiness',
    'per_chat_wri': 'Per‑chat WRI',
    'daily_wri': 'Daily WRI',
    
    // Journal
    'my_journal': 'My Journal',
    'journal_description': 'Write down your thoughts, feelings, and experiences in your personal space.',
    'your_entries': 'Your Entries',
    'new_entry': 'New Entry',
    'no_journal_entries': 'No journal entries yet. Create your first entry!',
    'create_new_entry': 'Create New Entry',
    'edit_entry': 'Edit Entry',
    'title': 'Title',
    'content': 'Content',
    'enter_journal_title': 'Enter journal title...',
    'write_thoughts': 'Write your thoughts here or use voice recording above...',
    'characters': 'characters',
    'created': 'Created',
    'updated': 'Updated',
    'select_journal_entry': 'Select a journal entry to read',
    'choose_entry_or_create': 'Choose an entry from the list or create a new one to get started.',
    'encrypted': 'Encrypted',
    'auto_clear_30min': '(Auto-clear in 30min)',
    'password_required': 'Password Required',
    'journal_created_success': 'Journal entry created and encrypted successfully! Your mood score will improve! 🎉',
    'journal_updated_success': 'Journal entry updated and encrypted successfully!',
    'journal_deleted_success': 'Journal entry deleted successfully!',
    'enter_password': 'Enter Journal Password',
    'create_password': 'Create Journal Password',
    'encrypted_content': 'Encrypted Content',
    'enter_password_to_view': 'Enter your password to view this journal entry',
    'decrypting_content': 'Decrypting journal content...',
    'please_sign_in_journal': 'Please sign in to access your journal',
    
    // Chat
    'new_chat': 'New Chat',
    'insights': 'Insights',
    'journaling': 'Journaling',
    'professional_help': 'Professional Help',
    'dashboard': 'Dashboard',
    'chat_placeholder': 'Type your message here...',
    'send': 'Send',
    'voice_recorder': 'Voice Recorder',
    'start_recording': 'Start Recording',
    'stop_recording': 'Stop Recording',
    'recording': 'Recording...',
    'transcribing': 'Transcribing...',
    'please_sign_in_chat': 'Please sign in to start chatting',
    
    // Professional Help
    'professional_help_title': 'Professional Help',
    'find_mental_health_professionals': 'Find mental health professionals near you',
    'search_location': 'Search location...',
    'search': 'Search',
    'no_results': 'No results found',
    'loading_professionals': 'Loading professionals...',
    'please_sign_in_professional': 'Please sign in to access professional help',
    
    // Login
    'welcome': 'Welcome',
    'sign_in_with_google': 'Sign in with Google',
    'sign_in_with_github': 'Sign in with GitHub',
    'sign_in_with_microsoft': 'Sign in with Microsoft',
    'sign_out': 'Sign Out',
    'mental_wellness_platform': 'Mental Wellness Platform',
    'your_mental_health_matters': 'Your mental health matters. Get support, track your mood, and find professional help when you need it.',
    
    // Theme
    'light_mode': 'Light Mode',
    'dark_mode': 'Dark Mode',
    
    // Language
    'language': 'Language',
    'english': 'English',
    'hindi': 'हिंदी',
    
    // Additional keys
    'continue_anonymously': 'Continue Anonymously',
    'no_account': 'No Account',
    'find_nearby_help': 'Find Nearby Help',
    'location_permission_message': 'We need your location to find the nearest mental health helpline centers in your area.',
    'getting_location': 'Getting Location...',
    'allow_location_access': 'Allow Location Access',
    
    // Journal specific
    'encrypted_journal_entry': 'Encrypted Journal Entry',
    'create_journal_password': 'Create Journal Password',
    'confirm_password': 'Confirm Password',
    'password_security_note': 'Your password is never sent to the server',
    'password_local_note': 'It\'s used locally to encrypt your data',
    'password_remember_note': 'Remember this password - it can\'t be recovered!',
    
    // Date and time
    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December',
    'am': 'AM',
    'pm': 'PM',
    
    // Chat specific
    'your_mental_wellness_companion': 'Your mental wellness companion',
    'ai_powered_private_secure': 'AI-Powered • Private • Secure',
    'or_continue_with': 'Or continue with',
    'by_continuing_you_agree': 'By continuing, you agree to our',
    'privacy_policy': 'Privacy Policy',
    'and': 'and',
    'terms_of_service': 'Terms of Service',
    'your_privacy_is_protected': 'Your Privacy is Protected',
    'new_chat_session_started': '🆕 New Chat Session Started',
    'previous_insights_displayed': 'Previous insights are displayed but not used for AI decisions',
    'wellness_insights': 'Wellness Insights',
    'stored_insights_previous_sessions': '💾 Stored Insights (Previous Sessions)',
    'type_your_message_here': 'Type your message here...',
    'please_sign_in_to_start_chatting': 'Please sign in to start chatting',
  },
  hi: {
    // Common
    'back_to_chat': 'चैट पर वापस जाएं',
    'loading': 'लोड हो रहा है...',
    'error': 'त्रुटि',
    'success': 'सफलता',
    'cancel': 'रद्द करें',
    'save': 'सहेजें',
    'edit': 'संपादित करें',
    'delete': 'हटाएं',
    'create': 'बनाएं',
    'update': 'अपडेट करें',
    'yes': 'हाँ',
    'no': 'नहीं',
    
    // Dashboard
    'mood_dashboard': 'मूड डैशबोर्ड',
    'mental_wellness_insights': 'आपकी मानसिक स्वास्थ्य अंतर्दृष्टि एक नज़र में',
    'todays_wri': 'आज का WRI',
    'band': 'बैंड',
    'insight': 'अंतर्दृष्टि',
    'band_explanation': 'बैंड स्पष्टीकरण',
    'trend': 'ट्रेंड',
    'top_contributors': 'शीर्ष योगदानकर्ता',
    'wri_trend': 'WRI ट्रेंड (अंतिम 30 प्रविष्टियां)',
    'screening_flags': 'स्क्रीनिंग फ्लैग्स',
    'personalized_recommendations': 'व्यक्तिगत सुझाव',
    'depression': 'अवसाद',
    'anxiety': 'चिंता',
    'burnout_strain': 'बर्नआउट तनाव',
    'social_isolation': 'सामाजिक अलगाव',
    'help_readiness': 'सहायता तत्परता',
    'per_chat_wri': 'प्रति-चैट WRI',
    'daily_wri': 'दैनिक WRI',
    
    // Journal
    'my_journal': 'मेरी डायरी',
    'journal_description': 'अपने विचार, भावनाएं और अनुभव अपने व्यक्तिगत स्थान में लिखें।',
    'your_entries': 'आपकी प्रविष्टियां',
    'new_entry': 'नई प्रविष्टि',
    'no_journal_entries': 'अभी तक कोई डायरी प्रविष्टि नहीं। अपनी पहली प्रविष्टि बनाएं!',
    'create_new_entry': 'नई प्रविष्टि बनाएं',
    'edit_entry': 'प्रविष्टि संपादित करें',
    'title': 'शीर्षक',
    'content': 'सामग्री',
    'enter_journal_title': 'डायरी शीर्षक दर्ज करें...',
    'write_thoughts': 'अपने विचार यहाँ लिखें या ऊपर वॉइस रिकॉर्डिंग का उपयोग करें...',
    'characters': 'वर्ण',
    'created': 'बनाया गया',
    'updated': 'अपडेट किया गया',
    'select_journal_entry': 'पढ़ने के लिए एक डायरी प्रविष्टि चुनें',
    'choose_entry_or_create': 'सूची से एक प्रविष्टि चुनें या शुरू करने के लिए एक नई बनाएं।',
    'encrypted': 'एन्क्रिप्टेड',
    'auto_clear_30min': '(30 मिनट में ऑटो-क्लियर)',
    'password_required': 'पासवर्ड आवश्यक',
    'journal_created_success': 'डायरी प्रविष्टि सफलतापूर्वक बनाई और एन्क्रिप्ट की गई! आपका मूड स्कोर सुधरेगा! 🎉',
    'journal_updated_success': 'डायरी प्रविष्टि सफलतापूर्वक अपडेट और एन्क्रिप्ट की गई!',
    'journal_deleted_success': 'डायरी प्रविष्टि सफलतापूर्वक हटाई गई!',
    'enter_password': 'डायरी पासवर्ड दर्ज करें',
    'create_password': 'डायरी पासवर्ड बनाएं',
    'encrypted_content': 'एन्क्रिप्टेड सामग्री',
    'enter_password_to_view': 'इस डायरी प्रविष्टि को देखने के लिए अपना पासवर्ड दर्ज करें',
    'decrypting_content': 'डायरी सामग्री डिक्रिप्ट हो रही है...',
    'please_sign_in_journal': 'अपनी डायरी तक पहुंचने के लिए कृपया साइन इन करें',
    
    // Chat
    'new_chat': 'नई चैट',
    'insights': 'अंतर्दृष्टि',
    'journaling': 'डायरी लेखन',
    'professional_help': 'व्यावसायिक सहायता',
    'dashboard': 'डैशबोर्ड',
    'chat_placeholder': 'अपना संदेश यहाँ टाइप करें...',
    'send': 'भेजें',
    'voice_recorder': 'वॉइस रिकॉर्डर',
    'start_recording': 'रिकॉर्डिंग शुरू करें',
    'stop_recording': 'रिकॉर्डिंग रोकें',
    'recording': 'रिकॉर्डिंग...',
    'transcribing': 'ट्रांसक्राइब हो रहा है...',
    'please_sign_in_chat': 'चैटिंग शुरू करने के लिए कृपया साइन इन करें',
    
    // Professional Help
    'professional_help_title': 'व्यावसायिक सहायता',
    'find_mental_health_professionals': 'अपने पास मानसिक स्वास्थ्य पेशेवरों को खोजें',
    'search_location': 'स्थान खोजें...',
    'search': 'खोजें',
    'no_results': 'कोई परिणाम नहीं मिला',
    'loading_professionals': 'पेशेवरों को लोड कर रहे हैं...',
    'please_sign_in_professional': 'व्यावसायिक सहायता तक पहुंचने के लिए कृपया साइन इन करें',
    
    // Login
    'welcome': 'स्वागत है',
    'sign_in_with_google': 'Google के साथ साइन इन करें',
    'sign_in_with_github': 'GitHub के साथ साइन इन करें',
    'sign_in_with_microsoft': 'Microsoft के साथ साइन इन करें',
    'sign_out': 'साइन आउट',
    'mental_wellness_platform': 'मानसिक स्वास्थ्य प्लेटफॉर्म',
    'your_mental_health_matters': 'आपका मानसिक स्वास्थ्य मायने रखता है। समर्थन प्राप्त करें, अपने मूड को ट्रैक करें, और जरूरत पड़ने पर व्यावसायिक सहायता खोजें।',
    
    // Theme
    'light_mode': 'लाइट मोड',
    'dark_mode': 'डार्क मोड',
    
    // Language
    'language': 'भाषा',
    'english': 'English',
    'hindi': 'हिंदी',
    
    // Additional keys
    'continue_anonymously': 'बिना खाते के जारी रखें',
    'no_account': 'कोई खाता नहीं',
    'find_nearby_help': 'पास में सहायता खोजें',
    'location_permission_message': 'आपके क्षेत्र में निकटतम मानसिक स्वास्थ्य हेल्पलाइन केंद्र खोजने के लिए हमें आपका स्थान चाहिए।',
    'getting_location': 'स्थान प्राप्त कर रहे हैं...',
    'allow_location_access': 'स्थान पहुंच की अनुमति दें',
    
    // Journal specific
    'encrypted_journal_entry': 'एन्क्रिप्टेड डायरी प्रविष्टि',
    'create_journal_password': 'डायरी पासवर्ड बनाएं',
    'confirm_password': 'पासवर्ड की पुष्टि करें',
    'password_security_note': 'आपका पासवर्ड कभी सर्वर पर नहीं भेजा जाता',
    'password_local_note': 'यह स्थानीय रूप से आपके डेटा को एन्क्रिप्ट करने के लिए उपयोग किया जाता है',
    'password_remember_note': 'इस पासवर्ड को याद रखें - इसे पुनर्प्राप्त नहीं किया जा सकता!',
    
    // Date and time
    'january': 'जनवरी',
    'february': 'फरवरी',
    'march': 'मार्च',
    'april': 'अप्रैल',
    'may': 'मई',
    'june': 'जून',
    'july': 'जुलाई',
    'august': 'अगस्त',
    'september': 'सितंबर',
    'october': 'अक्टूबर',
    'november': 'नवंबर',
    'december': 'दिसंबर',
    'am': 'पूर्वाह्न',
    'pm': 'अपराह्न',
    
    // Chat specific
    'your_mental_wellness_companion': 'आपका मानसिक स्वास्थ्य साथी',
    'ai_powered_private_secure': 'AI-संचालित • निजी • सुरक्षित',
    'or_continue_with': 'या इसके साथ जारी रखें',
    'by_continuing_you_agree': 'जारी रखकर, आप हमारी',
    'privacy_policy': 'गोपनीयता नीति',
    'and': 'और',
    'terms_of_service': 'सेवा की शर्तें',
    'your_privacy_is_protected': 'आपकी गोपनीयता सुरक्षित है',
    'new_chat_session_started': '🆕 नई चैट सत्र शुरू हुआ',
    'previous_insights_displayed': 'पिछली अंतर्दृष्टि प्रदर्शित की गई है लेकिन AI निर्णयों के लिए उपयोग नहीं की जाती',
    'wellness_insights': 'कल्याण अंतर्दृष्टि',
    'stored_insights_previous_sessions': '💾 संग्रहीत अंतर्दृष्टि (पिछले सत्र)',
    'type_your_message_here': 'अपना संदेश यहाँ टाइप करें...',
    'please_sign_in_to_start_chatting': 'चैटिंग शुरू करने के लिए कृपया साइन इन करें',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when changed
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('selectedLanguage', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
