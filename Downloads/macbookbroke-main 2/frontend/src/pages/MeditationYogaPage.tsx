import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import MeditationVideos from '../components/MeditationVideos';
import MeditationSounds from '../components/MeditationSounds';
import { MeditationService } from '../services/MeditationService';
import { MeditationStats } from '../types/MeditationTypes';
import { FireIcon, SparklesIcon, TrophyIcon } from '@heroicons/react/24/outline';

const meditationService = new MeditationService();

const MeditationYogaPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'videos' | 'sounds'>('videos');
  const [stats, setStats] = useState<MeditationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [currentUser?.uid]);

  const fetchStats = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoadingStats(true);
      const response = await meditationService.getMeditationStats(currentUser.uid);
      
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Error fetching meditation stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-indigo-100'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🧘‍♀️ {t('meditation_yoga')}
          </h1>
          <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('find_peace_balance')}
          </p>
        </div>

        {/* Stats Cards */}
        {!loadingStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`rounded-lg shadow-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Today's Points</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.pointsToday}/16
                  </p>
                </div>
                <SparklesIcon className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            <div className={`rounded-lg shadow-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Streak</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.currentStreak} days
                  </p>
                </div>
                <FireIcon className={`h-10 w-10 ${stats.currentStreak >= 7 ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
              {stats.currentStreak >= 7 && (
                <p className="text-xs text-orange-500 mt-1">🎉 Streak bonus active! -10 WRI</p>
              )}
            </div>

            <div className={`rounded-lg shadow-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Videos Watched</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.totalVideosWatched}
                  </p>
                </div>
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎥</span>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sounds Listened</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.totalSoundsListened}
                  </p>
                </div>
                <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Info */}
        <div className={`rounded-lg shadow-lg p-4 mb-8 ${isDark ? 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50' : 'bg-gradient-to-r from-purple-100 to-indigo-100'}`}>
          <div className="flex items-start space-x-3">
            <TrophyIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Earn Rewards & Reduce Your WRI
              </h3>
              <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>• Watch a video: <strong>+5 points</strong></li>
                <li>• Listen to a sound: <strong>+3 points</strong></li>
                <li>• Maximum per day: <strong>16 points</strong></li>
                <li>• 7-day streak: <strong>Extra -10 WRI reduction!</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className={`rounded-lg p-1 shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-purple-600 text-white shadow-md'
                  : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`
              }`}
            >
              🎥 Meditation Videos
            </button>
            <button
              onClick={() => setActiveTab('sounds')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'sounds'
                  ? 'bg-purple-600 text-white shadow-md'
                  : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`
              }`}
            >
              🎵 Meditation Sounds
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`rounded-xl shadow-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          {activeTab === 'videos' ? (
            <div>
              <h2 className={`text-2xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Meditation Videos
              </h2>
              <MeditationVideos />
            </div>
          ) : (
            <div>
              <h2 className={`text-2xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Meditation Sounds
              </h2>
              <MeditationSounds />
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className={`mt-12 rounded-xl p-6 ${isDark ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-100 to-indigo-100'}`}>
          <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('tips_for_better_practice')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t('for_meditation')}</h4>
              <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li>• {t('find_quiet_space')}</li>
                <li>• {t('start_shorter_sessions')}</li>
                <li>• {t('focus_breathing')}</li>
                <li>• {t('be_patient')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t('for_sounds')}</h4>
              <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li>• {t('use_headphones')}</li>
                <li>• {t('adjust_volume')}</li>
                <li>• {t('combine_breathing')}</li>
                <li>• {t('create_practice_space')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeditationYogaPage;
