import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MeditationService } from '../services/MeditationService';
import { MeditationVideo } from '../types/MeditationTypes';
import { PlayCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const meditationService = new MeditationService();

const MeditationVideos: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [videos, setVideos] = useState<MeditationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MeditationVideo | null>(null);
  const [trackingActivity, setTrackingActivity] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [currentUser?.uid]);

  const fetchVideos = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const response = await meditationService.getMeditationVideos(currentUser.uid);

      if (response.success && response.data) {
        setVideos(response.data);
      } else {
        setError(response.error || 'Failed to load meditation videos');
      }
    } catch (err) {
      setError('Failed to load meditation videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = async (video: MeditationVideo) => {
    if (!currentUser?.uid || trackingActivity) return;

    try {
      setTrackingActivity(true);
      
      const response = await meditationService.trackMeditationActivity({
        userId: currentUser.uid,
        activityType: 'video',
        itemId: video.id,
        completedAt: new Date().toISOString()
      });

      if (response.success) {
        console.log('✅ Video completion tracked:', {
          pointsEarned: response.pointsEarned,
          totalPointsToday: response.totalPointsToday,
          currentStreak: response.currentStreak,
          wriReduction: response.wriReduction
        });

        // Show success notification
        alert(`🎉 Great job! You earned ${response.pointsEarned} points!\n\nToday's Points: ${response.totalPointsToday}/16\nCurrent Streak: ${response.currentStreak} days\nWRI Reduction: -${response.wriReduction?.toFixed(1)}`);
      }
    } catch (err) {
      console.error('Error tracking video completion:', err);
    } finally {
      setTrackingActivity(false);
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

  if (videos.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <p className="text-lg">No meditation videos available yet.</p>
        <p className="text-sm mt-2">Check back soon for new content!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className={`relative rounded-lg shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={() => setSelectedVideo(video)}
          >
            <div className="relative h-48 bg-gradient-to-br from-purple-500 to-indigo-600">
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-30 transition-all duration-300">
                <PlayCircleIcon className="h-16 w-16 text-white opacity-80 hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </div>
            </div>
            <div className="p-4">
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {video.title}
              </h3>
              {video.description && (
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {video.description}
                </p>
              )}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag) => (
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
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className={`rounded-lg shadow-2xl p-6 max-w-4xl w-full relative ${
              isDark ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setSelectedVideo(null)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <h3 className={`text-2xl font-bold mb-4 pr-10 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedVideo.title}
            </h3>

            <video
              controls
              autoPlay
              className="w-full rounded-lg mb-4"
              src={selectedVideo.video_url}
              onEnded={() => handleVideoComplete(selectedVideo)}
            >
              Your browser does not support the video tag.
            </video>

            {selectedVideo.description && (
              <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedVideo.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Duration: {selectedVideo.duration}
              </div>
              {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag) => (
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

            <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                💡 <strong>Tip:</strong> Watch the full video to earn 5 points and reduce your WRI!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeditationVideos;
