import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MeditationService } from '../services/MeditationService';
import { MeditationSound } from '../types/MeditationTypes';
import { PlayIcon, PauseIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

const meditationService = new MeditationService();

const MeditationSounds: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [sounds, setSounds] = useState<MeditationSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [trackingActivity, setTrackingActivity] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSounds();
  }, [currentUser?.uid]);

  const fetchSounds = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const response = await meditationService.getMeditationSounds(currentUser.uid);

      if (response.success && response.data) {
        setSounds(response.data);
      } else {
        setError(response.error || 'Failed to load meditation sounds');
      }
    } catch (err) {
      setError('Failed to load meditation sounds');
      console.error('Error fetching sounds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSoundComplete = async (sound: MeditationSound) => {
    if (!currentUser?.uid || trackingActivity) return;

    try {
      setTrackingActivity(true);
      
      const response = await meditationService.trackMeditationActivity({
        userId: currentUser.uid,
        activityType: 'sound',
        itemId: sound.id,
        completedAt: new Date().toISOString()
      });

      if (response.success) {
        console.log('✅ Sound completion tracked:', {
          pointsEarned: response.pointsEarned,
          totalPointsToday: response.totalPointsToday,
          currentStreak: response.currentStreak,
          wriReduction: response.wriReduction
        });

        // Show success notification
        alert(`🎉 Well done! You earned ${response.pointsEarned} points!\n\nToday's Points: ${response.totalPointsToday}/16\nCurrent Streak: ${response.currentStreak} days\nWRI Reduction: -${response.wriReduction?.toFixed(1)}`);
      }
    } catch (err) {
      console.error('Error tracking sound completion:', err);
    } finally {
      setTrackingActivity(false);
    }
  };

  const togglePlay = (sound: MeditationSound) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        handleSoundComplete(sound);
        setPlayingSoundId(null);
      });
    }

    if (playingSoundId === sound.id) {
      audioRef.current.pause();
      setPlayingSoundId(null);
    } else {
      if (audioRef.current.src !== sound.sound_url) {
        audioRef.current.src = sound.sound_url;
      }
      audioRef.current.play();
      setPlayingSoundId(sound.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        {error}
      </div>
    );
  }

  if (sounds.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <p className="text-lg">No meditation sounds available yet.</p>
        <p className="text-sm mt-2">Check back soon for new content!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sounds.map((sound) => (
        <div
          key={sound.id}
          className={`flex items-center rounded-lg shadow-lg p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } ${playingSoundId === sound.id ? 'ring-2 ring-purple-500' : ''}`}
        >
          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-md flex items-center justify-center mr-4">
            <SpeakerWaveIcon className="h-8 w-8 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {sound.title}
            </h3>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {sound.duration}
            </p>
            {sound.description && (
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {sound.description}
              </p>
            )}
            {sound.tags && sound.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sound.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => togglePlay(sound)}
            className="ml-4 p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {playingSoundId === sound.id ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      ))}

      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
        <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
          💡 <strong>Tip:</strong> Listen to the full sound to earn 3 points and reduce your WRI!
        </p>
      </div>
    </div>
  );
};

export default MeditationSounds;

