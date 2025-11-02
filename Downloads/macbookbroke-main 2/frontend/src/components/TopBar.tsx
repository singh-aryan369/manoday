import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  HeartIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  Bars3Icon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  FireIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';

import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

interface TopBarProps {
  onNewChat: () => void;
  onToggleInsights: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onNewChat, onToggleInsights }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: t('new_chat'), icon: ChatBubbleLeftRightIcon, onClick: onNewChat, color: 'text-blue-400' },
    { label: t('Dashboard'), icon: SparklesIcon, onClick: () => navigate('/dashboard'), color: 'text-indigo-400' },
    { label: t('insights'), icon: SparklesIcon, onClick: onToggleInsights, color: 'text-purple-400' },
    { label: t('goal_tracker'), icon: ClipboardDocumentCheckIcon, onClick: () => navigate('/goal-tracker'), color: 'text-pink-400' },
    { label: t('personal_assistant'), icon: UserCircleIcon, onClick: () => navigate('/assistant'), color: 'text-cyan-400' },
    { label: t('journaling'), icon: BookOpenIcon, onClick: () => navigate('/journal'), color: 'text-green-400' },
    { label: t('meditation_and_yoga'), icon: FireIcon, onClick: () => navigate('/meditation-yoga'), color: 'text-rose-400' },
    { label: t('hobbies_and_wanderlust'), icon: PuzzlePieceIcon, onClick: () => navigate('/hobbies/survey'), color: 'text-amber-400' },
    { label: t('professional_help'), icon: HeartIcon, onClick: () => navigate('/professionalHelp'), color: 'text-orange-400' }
  ];

  return (
    <div className={`sticky top-0 z-50 backdrop-blur-sm shadow-lg border-b transition-colors duration-300 ${
      isDark 
        ? 'bg-gray-800/80 border-gray-700/50' 
        : 'bg-white/80 border-white/20'
    }`}>
      <div className="w-full px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section: Logo + App Name + Theme Toggle */}
          <div className="flex items-center space-x-6">
            {/* Logo & App Name */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img 
                  src="/Logo.png" 
                  alt="Manoday Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  Manoday
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>{t('your_mental_wellness_companion')}</p>
              </div>
            </div>

            {/* Theme Toggle with improved width */}
            <ThemeToggle />

            {/* Language Selector */}
            <LanguageSelector />
          </div>

          {/* Right Section: Navigation Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center space-x-3 px-5 py-2.5 rounded-xl transition-all duration-200 ${
                isDark 
                  ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200 border border-gray-600/50' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
              }`}
            >
              <Bars3Icon className="h-5 w-5" />
              <div className="text-left">
                <div className="text-sm font-semibold">
                  {currentUser?.isAnonymous ? t('guest_user') : (currentUser?.displayName || 'Friend')}
                </div>
                <div className={`text-xs flex items-center ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  {currentUser?.isAnonymous ? t('anonymous') : t('secure')}
                </div>
              </div>
              <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${
                isMenuOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border z-[9999] ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {/* User Info Section */}
                <div className={`px-4 py-3 border-b ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        isDark ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {currentUser?.isAnonymous ? t('guest_user') : (currentUser?.displayName || 'Friend')}
                      </p>
                      <p className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {currentUser?.email || t('anonymous_session')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="py-2">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick();
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 transition-colors duration-200 ${
                          isDark 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Logout Section */}
                <div className={`border-t ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors duration-200 ${
                      isDark 
                        ? 'hover:bg-red-900/20 text-red-400' 
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="text-sm font-semibold">{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
