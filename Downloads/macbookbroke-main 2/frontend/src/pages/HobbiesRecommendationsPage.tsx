import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { HobbiesService } from '../services/HobbiesService';
import { HobbyCatalog, HobbyLocation, UserHobbyProfile, OnlineCourse } from '../types/HobbiesTypes';
import { 
  SparklesIcon, 
  MapPinIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  StarIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const HobbiesRecommendationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const hobbiesService = new HobbiesService();

  const [suggestedHobbies, setSuggestedHobbies] = useState<HobbyCatalog[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<HobbyLocation[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<OnlineCourse[]>([]);
  const [userProfile, setUserProfile] = useState<UserHobbyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHobby, setSelectedHobby] = useState<HobbyCatalog | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [completingActivity, setCompletingActivity] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadRecommendations();
  }, [currentUser, navigate]);

  // Debug logging for online courses
  useEffect(() => {
    console.log('🎨 Rendering - onlineCourses.length:', onlineCourses.length);
  }, [onlineCourses]);

  const loadRecommendations = async () => {
    if (!currentUser?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await hobbiesService.getHobbySuggestions(currentUser.email, true);

      console.log('🔍 API Response:', response);
      console.log('📚 Online Courses:', response.online_courses);
      console.log('📊 Online Courses count:', response.online_courses?.length || 0);
      
      // Check source distribution
      if (response.online_courses) {
        const geminiCount = response.online_courses.filter((c: OnlineCourse) => c.source === 'gemini').length;
        const curatedCount = response.online_courses.filter((c: OnlineCourse) => c.source === 'curated').length;
        console.log(`🎯 Course sources - Gemini: ${geminiCount}, Curated: ${curatedCount}`);
      }

      if (response.success) {
        setSuggestedHobbies(response.suggested);
        setNearbyPlaces(response.nearby || []);
        setOnlineCourses(response.online_courses || []);
        setUserProfile(response.user_profile || null);
        
        console.log('✅ State updated - onlineCourses:', response.online_courses?.length || 0);
      } else {
        setError(response.error || 'Failed to load recommendations');
      }
    } catch (err) {
      setError('An error occurred while loading recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = async (activityType: 'session' | 'offline_class' | 'online_course', location?: HobbyLocation) => {
    if (!currentUser?.email || !selectedHobby) return;

    setCompletingActivity(true);

    try {
      const response = await hobbiesService.updateProgress({
        user_id: currentUser.email,
        hobby_id: selectedHobby.hobby_id,
        activity_type: activityType,
        location
      });

      if (response.success) {
        alert(`🎉 Activity completed successfully!\n\n${response.message}`);
        setShowActivityModal(false);
        setSelectedHobby(null);
        loadRecommendations(); // Reload to update completed activities
      } else {
        alert(`Error: ${response.error || 'Failed to update progress'}`);
      }
    } catch (err) {
      alert('An error occurred while updating progress');
    } finally {
      setCompletingActivity(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading your recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-xl font-semibold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
        <button
          onClick={() => navigate('/hobbies/survey')}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-colors"
        >
          Take Survey
        </button>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-xl font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Please complete the survey first
        </p>
        <button
          onClick={() => navigate('/hobbies/survey')}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-colors"
        >
          Take Survey
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {t('hobbies_recommendations')}
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('discover_new_hobbies')}
          </p>
        </div>

        {/* Recommended Hobbies */}
        {suggestedHobbies.length > 0 && (
          <div className="mb-12">
            <h2 className={`text-3xl font-bold mb-6 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <SparklesIcon className="h-8 w-8 mr-3 text-yellow-400" />
              Personalized Hobbies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedHobbies.map((hobby) => (
                <div
                  key={hobby.hobby_id}
                  className={`p-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                    isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                    isDark ? 'bg-purple-700 text-purple-100' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {hobby.category}
                  </span>
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {hobby.name}
                  </h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hobby.description}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedHobby(hobby);
                      setShowActivityModal(true);
                    }}
                    className={`w-full mt-4 px-5 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.03] shadow-md bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700`}
                  >
                    <CheckCircleIcon className="inline h-5 w-5 mr-2" />
                    Mark as Completed
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Courses Section - NEW */}
        {onlineCourses.length > 0 && (
          <div className="mb-12">
            <h2 className={`text-3xl font-bold mb-6 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AcademicCapIcon className="h-8 w-8 mr-3 text-blue-400" />
              {t('online_courses')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {onlineCourses.map((course, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                    isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div className="flex gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        course.price === 'Free' || course.price === 'Free Audit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {course.price}
                      </span>
                      {/* Source Badge */}
                      {course.source === 'gemini' && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse">
                          ✨ AI Recommended
                        </span>
                      )}
                      {course.source === 'curated' && (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                        }`}>
                          📚 Curated
                        </span>
                      )}
                    </div>
                    {course.rating && (
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {course.rating}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {course.title}
                  </h3>
                  <p className={`text-sm mb-2 flex items-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    {course.platform}
                  </p>
                  {course.instructor && (
                    <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('by')} {course.instructor}
                    </p>
                  )}
                  {course.duration && (
                    <p className={`text-sm mb-2 flex items-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {course.duration}
                    </p>
                  )}
                  {course.description && (
                    <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {course.description}
                    </p>
                  )}
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full mt-4 px-5 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.03] shadow-md flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700`}
                  >
                    <LinkIcon className="h-5 w-5 mr-2" />
                    {t('enroll_now')}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Places */}
        {nearbyPlaces.length > 0 && (
          <div className="mb-12">
            <h2 className={`text-3xl font-bold mb-6 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MapPinIcon className="h-8 w-8 mr-3 text-red-400" />
              Nearby Hobby Centers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyPlaces.map((place, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
                >
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {place.name}
                  </h3>
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {place.address}
                  </p>
                  {place.rating && (
                    <div className="flex items-center mb-2">
                      <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {place.rating}
                      </span>
                    </div>
                  )}
                  {place.distance_km && (
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      📍 {place.distance_km} km away
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        place.distance_category === 'nearby' ? 'bg-green-100 text-green-700' :
                        place.distance_category === 'city' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {place.distance_category}
                      </span>
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center text-sm font-semibold ${
                      isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    View on Map
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Modal */}
        {showActivityModal && selectedHobby && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`relative p-8 rounded-2xl shadow-2xl w-full max-w-md ${
              isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Complete Activity: {selectedHobby.name}
              </h3>
              <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                How did you engage with this hobby?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleCompleteActivity('session')}
                  disabled={completingActivity}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                    completingActivity ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <p className="font-semibold">Practice Session</p>
                  <p className="text-sm opacity-80">Practiced this hobby on my own</p>
                </button>

                <button
                  onClick={() => handleCompleteActivity('offline_class')}
                  disabled={completingActivity}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                    completingActivity ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <p className="font-semibold">Offline Class/Workshop</p>
                  <p className="text-sm opacity-80">Attended an in-person session</p>
                </button>

                <button
                  onClick={() => handleCompleteActivity('online_course')}
                  disabled={completingActivity}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                    completingActivity ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <p className="font-semibold">Online Course</p>
                  <p className="text-sm opacity-80">Completed an online lesson/course</p>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowActivityModal(false);
                  setSelectedHobby(null);
                }}
                disabled={completingActivity}
                className={`w-full mt-6 px-5 py-3 rounded-xl font-semibold transition-colors ${
                  isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HobbiesRecommendationsPage;
