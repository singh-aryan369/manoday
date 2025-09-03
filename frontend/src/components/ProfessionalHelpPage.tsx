import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ProfessionalHelpService from '../services/ProfessionalHelpService';
import { HelplineCenter, UserLocation } from '../types/ProfessionalHelpTypes';

const ProfessionalHelpPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [helplineCenters, setHelplineCenters] = useState<HelplineCenter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<HelplineCenter | null>(null);

  const professionalHelpService = new ProfessionalHelpService();

  useEffect(() => {
    // Check if user is authenticated
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  const requestLocationPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const location: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setUserLocation(location);
      setLocationPermission(true);

      // Fetch nearby helpline centers
      await fetchNearbyHelplines(location);

    } catch (err: any) {
      console.error('Location permission error:', err);
      setError(err.message || 'Failed to get location permission');
      setLocationPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyHelplines = async (location: UserLocation) => {
    try {
      setLoading(true);
      const centers = await professionalHelpService.getNearbyHelplines(location);
      setHelplineCenters(centers);
    } catch (err: any) {
      console.error('Error fetching helplines:', err);
      setError('Failed to fetch nearby helpline centers');
    } finally {
      setLoading(false);
    }
  };

  const handleCallHelpline = (center: HelplineCenter) => {
    setSelectedCenter(center);
    // In a real app, this would initiate a phone call
    window.open(`tel:${center.phoneNumber}`, '_self');
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  const renderLocationPermission = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className={`max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Find Nearby Help
          </h2>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            We need your location to find the nearest mental health helpline centers in your area.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={requestLocationPermission}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting Location...
              </>
            ) : (
              'Allow Location Access'
            )}
          </button>

          <button
            onClick={handleBackToChat}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Back to Chat
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHelplineCenters = () => (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Nearby Helpline Centers
            </h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2`}>
              Available 24/7 mental health support in your area
            </p>
          </div>
          <button
            onClick={handleBackToChat}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Back to Chat
          </button>
        </div>

        {/* Location Info */}
        {userLocation && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-blue-50'} rounded-lg p-4 mb-6`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className={`${isDark ? 'text-gray-300' : 'text-blue-800'} text-sm`}>
                Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Helpline Centers List */}
        {!loading && helplineCenters.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {helplineCenters.map((center, index) => (
              <div
                key={index}
                className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-200`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                      {center.name}
                    </h3>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mb-2`}>
                      {center.address}
                    </p>
                    <div className="flex items-center text-sm text-green-600 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Available 24/7
                    </div>
                    {center.distance && (
                      <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                        {center.distance.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleCallHelpline(center)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call for Help
                  </button>
                  
                  {/* Display phone number below the button */}
                  <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-3 text-center`}>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium mb-1`}>
                      Contact Number:
                    </p>
                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-lg font-bold`}>
                      {center.phoneNumber}
                    </p>
                  </div>

                  {center.website && (
                    <a
                      href={center.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit Website
                    </a>
                  )}
                </div>

                {center.specialties && center.specialties.length > 0 && (
                  <div className="mt-4">
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm font-medium mb-2`}>
                      Specialties:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {center.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Centers Found */}
        {!loading && helplineCenters.length === 0 && !error && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-yellow-50'} border border-yellow-200 rounded-lg p-6 text-center`}>
            <svg className="w-12 h-12 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
              No Helpline Centers Found
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              We couldn't find any helpline centers in your immediate area. Please try a different location or contact national helplines.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-red-50'} border border-red-200 rounded-lg p-6 text-center`}>
            <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
              Error Loading Helplines
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              {error}
            </p>
            <button
              onClick={() => fetchNearbyHelplines(userLocation!)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (locationPermission === null) {
    return renderLocationPermission();
  }

  return renderHelplineCenters();
};

export default ProfessionalHelpPage;
