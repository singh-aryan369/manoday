import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { HobbiesService } from '../services/HobbiesService';
import { HOBBY_CATEGORIES, BUDGET_RANGES, TIME_AVAILABILITY } from '../types/HobbiesTypes';
import { 
  SparklesIcon, 
  MapPinIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const HobbiesSurveyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const hobbiesService = new HobbiesService();

  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<'low' | 'medium' | 'high'>('medium');
  const [timeAvailability, setTimeAvailability] = useState<'weekdays' | 'weekends' | 'flexible'>('flexible');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleHobbyToggle = (hobby: string) => {
    setSelectedHobbies(prev => 
      prev.includes(hobby) 
        ? prev.filter(h => h !== hobby)
        : [...prev, hobby]
    );
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError(t('geolocation_not_supported_browser'));
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGettingLocation(false);
        
        // Reverse geocode to get city name (simplified)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
          .then(res => res.json())
          .then(data => {
            if (data.address) {
              setCity(data.address.city || data.address.town || data.address.village || 'Unknown');
            }
          })
          .catch(err => console.error('Error getting city name:', err));
      },
      (error) => {
        setError(`${t('error_getting_location')}: ${error.message}`);
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (selectedHobbies.length === 0) {
      setError(t('select_at_least_one'));
      return;
    }

    if (!city || !userLocation) {
      setError(t('provide_location'));
      return;
    }

    if (!currentUser?.email) {
      setError(t('user_not_authenticated'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await hobbiesService.submitSurvey({
        user_id: currentUser.email,
        preferred_hobbies: selectedHobbies,
        budget_range: budgetRange,
        time_availability: timeAvailability,
        location: {
          city: city,
          lat: userLocation.lat,
          lng: userLocation.lng
        }
      });

      if (response.success) {
        navigate('/hobbies/recommendations');
      } else {
        setError(response.error || 'Failed to submit survey');
      }
    } catch (err) {
      setError('An error occurred while submitting the survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="h-12 w-12 text-purple-600 mr-3" />
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('discover_your_hobbies')}
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('tell_us_interests')}
          </p>
        </div>

        {/* Survey Form */}
        <div className={`rounded-3xl shadow-2xl border-2 p-8 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Hobby Selection */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('what_interests_you')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HOBBY_CATEGORIES.map((hobby) => (
                <button
                  key={hobby}
                  onClick={() => handleHobbyToggle(hobby)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedHobbies.includes(hobby)
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:border-purple-500'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{hobby}</span>
                    {selectedHobbies.includes(hobby) && (
                      <CheckCircleIcon className="h-5 w-5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('whats_your_budget')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUDGET_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setBudgetRange(range.value as any)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    budgetRange === range.value
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:border-purple-500'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="text-3xl mb-2">{range.icon}</div>
                  <div className="font-bold text-lg mb-1">{range.value.toUpperCase()}</div>
                  <div className="text-sm opacity-80">{range.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Availability */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('when_available')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIME_AVAILABILITY.map((time) => (
                <button
                  key={time.value}
                  onClick={() => setTimeAvailability(time.value as any)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    timeAvailability === time.value
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:border-purple-500'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-purple-400'
                  }`}
                >
                  <div className="text-3xl mb-2">{time.icon}</div>
                  <div className="font-bold text-lg">{time.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('your_location')}
            </h2>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('city_placeholder')}
                className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                  gettingLocation
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                }`}
              >
                <MapPinIcon className="h-5 w-5" />
                <span>{gettingLocation ? t('getting_location') : t('use_current_location')}</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || selectedHobbies.length === 0 || !city}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl ${
              loading || selectedHobbies.length === 0 || !city
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
            }`}
          >
            {loading ? `${t('loading')}...` : `${t('get_recommendations')} 🎯`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HobbiesSurveyPage;

