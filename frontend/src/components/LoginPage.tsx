import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LockClosedIcon, ShieldCheckIcon, UserIcon, SparklesIcon, HeartIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

const LoginPage: React.FC = () => {
  const { currentUser, signInWithGoogle, signInWithGithub, signInWithMicrosoft, signInAnonymously } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Redirect to chat if user is already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/chat');
    }
  }, [currentUser, navigate]);

  // Animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignIn = async (provider: string, signInFunction: () => Promise<void>) => {
    setIsLoading(provider);
    try {
      await signInFunction();
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      alert(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsLoading('Anonymous');
    try {
      await signInAnonymously();
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      const errorMessage = error?.code === 'auth/operation-not-allowed' 
        ? 'Anonymous authentication is not enabled. Please ask the administrator to enable anonymous sign-in in Firebase Console.'
        : `Failed to sign in anonymously: ${error?.message || 'Please try again.'}`;
      alert(errorMessage);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
    }`}>
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob ${
          isDark ? 'bg-purple-600' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob ${
          isDark ? 'bg-indigo-600' : 'bg-yellow-300'
        }`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob ${
          isDark ? 'bg-pink-600' : 'bg-pink-300'
        }`} style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className={`max-w-md w-full space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <HeartIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="mt-8 text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Manoday
            </h1>
            <p className={`mt-3 text-lg font-medium transition-colors duration-300 ${
              isDark ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Your mental wellness companion
            </p>
            <div className={`mt-4 flex items-center justify-center space-x-2 text-sm transition-colors duration-300 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <SparklesIcon className="h-4 w-4 text-purple-500" />
              <span>AI-Powered • Private • Secure</span>
            </div>
          </div>

          {/* Login Options */}
          <div className="space-y-6">
            {/* Anonymous Login */}
            <div className={`backdrop-blur-sm rounded-2xl shadow-xl border transition-colors duration-300 ${
              isDark 
                ? 'bg-gray-800/80 border-gray-700/50' 
                : 'bg-white/80 border-white/20'
            }`}>
              <button
                onClick={handleAnonymousSignIn}
                disabled={isLoading !== null}
                className={`w-full group relative flex items-center justify-center px-6 py-4 rounded-xl shadow-sm text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 border border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-500 focus:ring-purple-500'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 hover:from-gray-100 hover:to-gray-200 focus:ring-purple-500'
                }`}
              >
                {isLoading === 'Anonymous' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                ) : (
                  <>
                    <UserIcon className="w-5 h-5 mr-3 text-purple-600" />
                    Continue Anonymously
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">No Account</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className={`absolute inset-0 flex items-center ${
                isDark ? 'border-gray-600' : 'border-gray-300/50'
              }`}>
                <div className={`w-full border-t transition-colors duration-300 ${
                  isDark ? 'border-gray-600' : 'border-gray-300/50'
                }`} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 font-medium transition-colors duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-gray-400' 
                    : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-500'
                }`}>Or continue with</span>
              </div>
            </div>

            {/* OAuth Options */}
            <div className="space-y-4">
              {/* Google */}
              <button
                onClick={() => handleSignIn('Google', signInWithGoogle)}
                disabled={isLoading !== null}
                className={`w-full group relative flex items-center justify-center px-6 py-4 border rounded-xl shadow-sm text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 focus:ring-blue-500'
                    : 'bg-white border-gray-200 text-gray-700 hover:shadow-md focus:ring-blue-500'
                }`}
              >
                {isLoading === 'Google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* GitHub */}
              <button
                onClick={() => handleSignIn('GitHub', signInWithGithub)}
                disabled={isLoading !== null}
                className="w-full group relative flex items-center justify-center px-6 py-4 bg-gray-900 border border-gray-800 rounded-xl shadow-sm text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
              >
                {isLoading === 'GitHub' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-300"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </>
                )}
              </button>

              {/* Microsoft */}
              <button
                onClick={() => handleSignIn('Microsoft', signInWithMicrosoft)}
                disabled={isLoading !== null}
                className="w-full group relative flex items-center justify-center px-6 py-4 bg-blue-600 border border-blue-700 rounded-xl shadow-sm text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
              >
                {isLoading === 'Microsoft' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#f25022" d="M1 1h10v10H1z"/>
                      <path fill="#7fba00" d="M13 1h10v10H13z"/>
                      <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                      <path fill="#ffb900" d="M13 13h10v10H13z"/>
                    </svg>
                    Continue with Microsoft
                  </>
                )}
              </button>
            </div>

            {/* Privacy Notice */}
            <div className="text-center">
              <p className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                By continuing, you agree to our{' '}
                <button className="text-purple-600 hover:text-purple-500 bg-transparent border-none p-0 underline font-medium">Privacy Policy</button>
                {' '}and{' '}
                <button className="text-purple-600 hover:text-purple-500 bg-transparent border-none p-0 underline font-medium">Terms of Service</button>
              </p>
            </div>
          </div>

          {/* Features Highlight */}
          <div className={`backdrop-blur-sm rounded-2xl shadow-lg border transition-colors duration-300 ${
            isDark 
              ? 'bg-gray-800/60 border-gray-700/20' 
              : 'bg-white/60 border-white/20'
          }`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center transition-colors duration-300 ${
              isDark ? 'text-gray-200' : 'text-gray-800'
            }`}>
              <ShieldCheckIcon className="h-4 w-4 mr-2 text-green-500" />
              Your Privacy is Protected
            </h3>
            <div className={`space-y-2 text-xs transition-colors duration-300 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span><strong>Anonymous Mode:</strong> Chat confidentially without revealing your identity</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                <span><strong>OAuth Mode:</strong> Industry-standard authentication with encrypted conversations</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                <span><strong>AI-Powered:</strong> Personalized support using advanced AI technology</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
