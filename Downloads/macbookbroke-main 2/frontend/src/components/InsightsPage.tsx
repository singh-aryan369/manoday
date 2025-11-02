import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiConfig } from '../config/apiConfig';
import {
  HeartIcon,
  SparklesIcon,
  ShieldCheckIcon,
  FaceSmileIcon,
  MoonIcon,
  FireIcon,
  BookOpenIcon,
  UserGroupIcon,
  LightBulbIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Define wellness data structure
interface WellnessData {
  mood?: string;
  sleepHours?: string;
  stressLevel?: string;
  academicPressure?: string;
  socialSupport?: string;
  loneliness?: string;
  confidenceLevel?: string;
  hobbiesInterest?: string;
  opennessToJournaling?: string;
  willingForProfessionalHelp?: string;
}

const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [wellnessData, setWellnessData] = useState<WellnessData>({});
  const [loading, setLoading] = useState(true);

  // Icon mapping for wellness parameters
  const getIconForKey = (key: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      mood: <FaceSmileIcon className="h-8 w-8" />,
      sleepHours: <MoonIcon className="h-8 w-8" />,
      stressLevel: <FireIcon className="h-8 w-8" />,
      academicPressure: <AcademicCapIcon className="h-8 w-8" />,
      socialSupport: <UserGroupIcon className="h-8 w-8" />,
      loneliness: <HeartIcon className="h-8 w-8" />,
      confidenceLevel: <SparklesIcon className="h-8 w-8" />,
      hobbiesInterest: <LightBulbIcon className="h-8 w-8" />,
      opennessToJournaling: <BookOpenIcon className="h-8 w-8" />,
      willingForProfessionalHelp: <ChatBubbleLeftRightIcon className="h-8 w-8" />
    };
    return iconMap[key] || <SparklesIcon className="h-8 w-8" />;
  };

  // Color mapping for different parameters (matching the card design)
  const getCardColorClass = (index: number) => {
    const colors = [
      'from-yellow-500 to-orange-500',   // #f9b234
      'from-green-500 to-emerald-500',    // #3ecd5e
      'from-orange-600 to-red-600',       // #e44002
      'from-purple-600 to-violet-600',    // #952aff
      'from-pink-600 to-rose-600',        // #cd3e94
      'from-indigo-600 to-blue-600'       // #4c49ea
    ];
    return colors[index % colors.length];
  };

  // Load encrypted wellness insights from backend
  const loadEncryptedInsights = async () => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(apiConfig.getEncryptedInsights, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          includeHistory: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.wellnessData) {
          setWellnessData(result.data.wellnessData);
          console.log('✅ Loaded wellness insights:', result.data.wellnessData);
        }
      }
    } catch (error) {
      console.error('❌ Error loading encrypted insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEncryptedInsights();
  }, [currentUser]);

  // Format key name to readable text
  const formatKeyName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter out journal-related data
  const filteredEntries = Object.entries(wellnessData).filter(
    ([key]) => !key.toLowerCase().includes('journal')
  );

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`text-center p-8 rounded-2xl ${
          isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
        }`}>
          <ShieldCheckIcon className="h-16 w-16 mx-auto mb-4 text-purple-500" />
          <p className="text-lg font-semibold">Please sign in to view your insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold flex items-center ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <SparklesIcon className="h-10 w-10 mr-3 text-purple-500" />
                Wellness Insights
              </h1>
              <p className={`mt-2 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your personalized mental wellness data at a glance
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadEncryptedInsights}
                disabled={loading}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isDark
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => navigate('/chat')}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
              <p className={`text-lg font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Loading your insights...
              </p>
            </div>
          </div>
        ) : filteredEntries.length > 0 ? (
          <>
            {/* Privacy Notice */}
            <div className={`mb-8 p-5 rounded-2xl border-2 ${
              isDark
                ? 'bg-blue-900/20 border-blue-700/50'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start space-x-3">
                <ShieldCheckIcon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <div>
                  <h3 className={`font-semibold mb-1 ${
                    isDark ? 'text-blue-200' : 'text-blue-900'
                  }`}>
                    Your Privacy is Protected
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    All wellness insights are encrypted with your email as the key. 
                    Even we cannot read your data. Your privacy is our top priority.
                  </p>
                </div>
              </div>
            </div>

            {/* Insights Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map(([key, value], index) => (
                <div
                  key={key}
                  className={`group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    isDark ? 'bg-gray-800' : 'bg-gray-900'
                  }`}
                >
                  {/* Animated Background Circle */}
                  <div
                    className={`absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br ${getCardColorClass(
                      index
                    )} transition-transform duration-500 group-hover:scale-[10] opacity-90`}
                  ></div>

                  {/* Card Content */}
                  <div className="relative z-10 p-8">
                    {/* Icon */}
                    <div className="mb-6 text-white opacity-90">
                      {getIconForKey(key)}
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-2xl mb-6 min-h-[70px] leading-tight">
                      {formatKeyName(key)}
                    </h3>

                    {/* Value */}
                    <div className="text-white">
                      <div className="text-sm opacity-80 mb-1">Current Value:</div>
                      <div className={`text-xl font-bold bg-gradient-to-r ${getCardColorClass(
                        index
                      )} bg-clip-text text-transparent group-hover:text-white transition-colors duration-500`}>
                        {value || 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => navigate('/dashboard')}
                className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                  isDark
                    ? 'bg-indigo-900/20 border-indigo-700/50 hover:bg-indigo-900/40'
                    : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <SparklesIcon className={`h-8 w-8 mb-3 ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
                <h3 className={`font-semibold text-lg mb-1 ${
                  isDark ? 'text-indigo-200' : 'text-indigo-900'
                }`}>
                  View Full Dashboard
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-indigo-300' : 'text-indigo-700'
                }`}>
                  See your WRI score, trends, and recommendations
                </p>
              </button>

              <button
                onClick={() => navigate('/journal')}
                className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                  isDark
                    ? 'bg-green-900/20 border-green-700/50 hover:bg-green-900/40'
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                }`}
              >
                <BookOpenIcon className={`h-8 w-8 mb-3 ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`} />
                <h3 className={`font-semibold text-lg mb-1 ${
                  isDark ? 'text-green-200' : 'text-green-900'
                }`}>
                  Start Journaling
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-green-300' : 'text-green-700'
                }`}>
                  Improve your WRI by writing about your day
                </p>
              </button>

              <button
                onClick={() => navigate('/chat')}
                className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                  isDark
                    ? 'bg-purple-900/20 border-purple-700/50 hover:bg-purple-900/40'
                    : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <ChatBubbleLeftRightIcon className={`h-8 w-8 mb-3 ${
                  isDark ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h3 className={`font-semibold text-lg mb-1 ${
                  isDark ? 'text-purple-200' : 'text-purple-900'
                }`}>
                  Continue Chatting
                </h3>
                <p className={`text-sm ${
                  isDark ? 'text-purple-300' : 'text-purple-700'
                }`}>
                  Update your wellness data through conversation
                </p>
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className={`inline-block p-8 rounded-3xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <img 
                src="/Logo.png" 
                alt="Manoday Logo" 
                className={`h-24 w-24 mx-auto mb-6 object-contain ${
                  isDark ? 'opacity-60' : 'opacity-40'
                }`}
              />
              <h2 className={`text-2xl font-bold mb-3 ${
                isDark ? 'text-gray-200' : 'text-gray-900'
              }`}>
                No Insights Yet
              </h2>
              <p className={`text-lg mb-6 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Start chatting with our AI to collect wellness insights
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                Start Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;

