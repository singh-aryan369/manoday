import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiConfig } from '../config/apiConfig';
import { JournalService } from '../services/JournalService';
import { JournalEntry } from '../types/JournalTypes';
import { journalConfig } from '../config/journalConfig';
import VoiceRecorder from './VoiceRecorder';
import { PasswordInput } from './PasswordInput';
import { SecurePasswordStorage } from '../services/SecurePasswordStorage';
import { normalizeInputs, computeWRI, writeTodayWri, calculateJournalMetrics, storeJournalInsights, getReadableJournalMetrics } from '../services/MoodScoreService';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';

const JournalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userPassword, setUserPassword] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'create' | 'read' | 'update' | null>(null);
  const [decryptedJournal, setDecryptedJournal] = useState<{ title: string; content: string } | null>(null);
  const [journalMetrics, setJournalMetrics] = useState<{
    journal_streak: number;
    weekly_journal_count: number;
    last_journal_date: string | null;
    journal_entries_today: number;
  } | null>(null);

  const journalService = new JournalService();

  useEffect(() => {
    if (currentUser?.email) {
      loadJournals();
      loadJournalMetrics();
      
      // Check if we have a stored password for this user
      const storedPassword = SecurePasswordStorage.getPassword(currentUser.email);
      if (storedPassword) {
        setUserPassword(storedPassword);
        console.log('🔒 Loaded stored password for user');
      }
    }
  }, [currentUser?.email]);

  // Extend session on user activity
  useEffect(() => {
    if (currentUser?.email && userPassword) {
      const interval = setInterval(() => {
        SecurePasswordStorage.extendSession(currentUser.email!);
      }, 5 * 60 * 1000); // Extend every 5 minutes

      return () => clearInterval(interval);
    }
  }, [currentUser?.email, userPassword]);

  useEffect(() => {
    if (selectedJournal) {
      console.log('📖 Selected journal changed:', selectedJournal);
    }
  }, [selectedJournal]);

  const loadJournals = async () => {
    if (!currentUser?.email) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📖 Loading journals for user:', currentUser.email);

      const response = await journalService.listJournals({
        userId: currentUser.email,
        limit: journalConfig.ui.paginationLimit
      });

      console.log('📖 Load journals response:', response);

      if (response.success && response.data) {
        setJournals(response.data.journals);
        console.log('📖 Journals loaded:', response.data.journals.length);
      } else {
        setError(response.error || 'Failed to load journals');
      }
    } catch (err) {
      console.error('📖 Load journals error:', err);
      setError('Failed to load journals');
    } finally {
      setLoading(false);
    }
  };

  const loadJournalMetrics = async () => {
    if (!currentUser?.email) return;
    
    try {
      const metrics = await calculateJournalMetrics(currentUser.email);
      setJournalMetrics(metrics);
      console.log('📊 Journal metrics loaded:', metrics);
    } catch (err) {
      console.error('📊 Failed to load journal metrics:', err);
    }
  };

  const handleCreateJournal = async () => {
    if (!currentUser?.email || !title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (!userPassword) {
      setPasswordAction('create');
      setShowPasswordInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Creating encrypted journal entry:', {
        title: title.trim(),
        content: content.trim(),
        userId: currentUser.email
      });

      const response = await journalService.createJournalEncrypted(
        title.trim(),
        content.trim(),
        currentUser.email,
        userPassword
      );

      console.log('🔐 Encrypted journal creation response:', response);

      if (response.success) {
        setSuccess(t('journal_created_success'));
        setTitle('');
        setContent('');
        setIsCreating(false);
        loadJournals();

        // Store journal metrics (no WRI modification - journal bonus applied only in dashboard avg)
        try {
          // Wait a moment for Firestore to update, then calculate fresh journal metrics including the new entry
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          const journalMetrics = await calculateJournalMetrics(currentUser.email);
          console.log('📊 JOURNAL: Fresh metrics calculated after creation:', journalMetrics);
          
          // Calculate journal bonus for logging (but don't write to WRI history)
          const baseBonus = journalMetrics.journal_entries_today > 0 ? 5 : 0;
          const frequencyBonus = Math.min(10, journalMetrics.journal_entries_today * 3);
          const weeklyBonus = journalMetrics.weekly_journal_count >= 3 ? Math.min(15, journalMetrics.weekly_journal_count * 2) : 0;
          
          let streakBonus = 0;
          if (journalMetrics.journal_streak >= 1 && journalMetrics.journal_streak < 3) {
            streakBonus = 2;
          } else if (journalMetrics.journal_streak >= 3 && journalMetrics.journal_streak < 7) {
            streakBonus = 8;
          } else if (journalMetrics.journal_streak >= 7 && journalMetrics.journal_streak < 14) {
            streakBonus = 15;
          } else if (journalMetrics.journal_streak >= 14 && journalMetrics.journal_streak < 30) {
            streakBonus = 25;
          } else if (journalMetrics.journal_streak >= 30) {
            streakBonus = 40;
          }
          
          const totalJournalBonus = baseBonus + frequencyBonus + weeklyBonus + streakBonus;
          
          console.log('📊 JOURNAL BONUS CALCULATED (will apply to AVG WRI in dashboard):', {
            baseBonus,
            frequencyBonus,
            weeklyBonus,
            streakBonus,
            totalJournalBonus,
            entries: journalMetrics.journal_entries_today,
            streak: journalMetrics.journal_streak
          });

          // Store ONLY journal insights (no WRI point creation)
          console.log('📝 JOURNAL: Storing journal insights:', journalMetrics);
          await storeJournalInsights(currentUser.email, journalMetrics);
          console.log('📝 JOURNAL: Journal insights stored successfully');
          console.log('✅ Journal bonus will reduce AVG WRI (gauge) in dashboard, not individual chat points (graph)');
          
          // Update local state to reflect new metrics immediately
          setJournalMetrics(journalMetrics);
          
          // Show streak achievement if applicable
          if (journalMetrics.journal_streak > 0 && (journalMetrics.journal_streak === 3 || journalMetrics.journal_streak === 7 || journalMetrics.journal_streak === 14 || journalMetrics.journal_streak === 30)) {
            const achievementTitle = journalMetrics.journal_streak === 30 ? '🏆 Master Journaler!' :
                                    journalMetrics.journal_streak === 14 ? '🎖️ Champion Streaker!' :
                                    journalMetrics.journal_streak === 7 ? '🔥 Week Warrior!' :
                                    '⭐ Rising Star!';
            console.log(`🎉 ACHIEVEMENT UNLOCKED: ${achievementTitle} (${journalMetrics.journal_streak} day streak!)`);
          }
          
        } catch (e) {
          console.warn('❌ Journal insights storage failed:', e);
        }
      } else {
        setError(response.error || 'Failed to create encrypted journal entry');
      }
    } catch (err) {
      console.error('🔐 Encrypted journal creation error:', err);
      setError('Failed to create encrypted journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJournal = async () => {
    if (!currentUser?.email || !selectedJournal || !title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (!userPassword) {
      setPasswordAction('update');
      setShowPasswordInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await journalService.updateJournalEncrypted(
        selectedJournal.id,
        title.trim(),
        content.trim(),
        currentUser.email,
        userPassword
      );

      if (response.success) {
        setSuccess('Journal entry updated and encrypted successfully!');
        setTitle('');
        setContent('');
        setSelectedJournal(null);
        setIsEditing(false);
        loadJournals();
        
        // Refresh journal metrics after update
        await loadJournalMetrics();
      } else {
        setError(response.error || 'Failed to update encrypted journal entry');
      }
    } catch (err) {
      setError('Failed to update encrypted journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    if (!currentUser?.email) return;

    if (!window.confirm('Are you sure you want to delete this journal entry?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await journalService.deleteJournal({
        journalId,
        userId: currentUser.email
      });

      if (response.success) {
        setSuccess('Journal entry deleted successfully!');
        if (selectedJournal?.id === journalId) {
          setSelectedJournal(null);
          setIsEditing(false);
          setTitle('');
          setContent('');
        }
        loadJournals();
        
        // Refresh journal metrics after deletion to update streak and bonus calculations
        await loadJournalMetrics();
      } else {
        setError(response.error || 'Failed to delete journal entry');
      }
    } catch (err) {
      setError('Failed to delete journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJournal = async (journal: JournalEntry) => {
    if (!userPassword) {
      setPasswordAction('read');
      setShowPasswordInput(true);
      return;
    }
    
    setSelectedJournal(journal);
    
    // Always decrypt the journal for editing
    try {
      console.log('🔐 Decrypting journal for editing...');
      const result = await journalService.readJournalEncrypted(
        journal.id,
        currentUser?.email || '',
        userPassword
      );

      if (result.success && result.data) {
        console.log('🔐 Journal decrypted successfully for editing');
        setTitle(result.data.title);
        setContent(result.data.content);
        setDecryptedJournal(result.data);
      } else {
        console.error('🔐 Failed to decrypt journal for editing:', result.error);
        setError('Failed to decrypt journal entry - wrong password?');
        return;
      }
    } catch (error) {
      console.error('🔐 Error decrypting journal for editing:', error);
      setError('Failed to decrypt journal entry');
      return;
    }
    
    setIsEditing(true);
    setIsCreating(false);
  };

  const handlePasswordSubmit = (password: string) => {
    if (!currentUser?.email) return;
    
    // Store password securely
    SecurePasswordStorage.storePassword(currentUser.email, password);
    setUserPassword(password);
    setShowPasswordInput(false);
    
    // Continue with the action that was waiting for password
    if (passwordAction === 'create') {
      handleCreateJournal();
    } else if (passwordAction === 'update') {
      handleUpdateJournal();
    } else if (passwordAction === 'read') {
      // Password is now set, user can read journals
      setPasswordAction(null);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordInput(false);
    setPasswordAction(null);
  };

  /**
   * Decrypt journal data when a journal is selected
   */
  const decryptJournalData = async (journal: JournalEntry) => {
    if (!currentUser?.email || !userPassword) {
      console.log('🔐 Cannot decrypt: missing user email or password');
      return;
    }

    try {
      console.log('🔐 Decrypting journal data for display...');
      
      const result = await journalService.readJournalEncrypted(
        journal.id,
        currentUser.email,
        userPassword
      );

      if (result.success && result.data) {
        console.log('🔐 Journal decrypted successfully for display');
        setDecryptedJournal(result.data);
      } else {
        console.error('🔐 Failed to decrypt journal:', result.error);
        setError('Failed to decrypt journal entry - wrong password?');
        setDecryptedJournal(null);
      }
    } catch (error) {
      console.error('🔐 Error decrypting journal:', error);
      setError('Failed to decrypt journal entry');
      setDecryptedJournal(null);
    }
  };

  const handleNewJournal = () => {
    setSelectedJournal(null);
    setTitle('');
    setContent('');
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedJournal(null);
    setTitle('');
    setContent('');
    setIsCreating(false);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setDecryptedJournal(null);
  };

  // Clear passwords when user changes (actual logout)
  useEffect(() => {
    return () => {
      // Only clear password if user is actually logging out
      // Don't clear on page refresh - let the 30-minute timeout handle it
      console.log('🔒 Component unmounting - password will remain in memory until timeout');
    };
  }, []);

  const formatDate = (date: any) => {
    let dateObj: Date;
    
    // Handle Firebase timestamp format
    if (date && typeof date === 'object' && date._seconds) {
      dateObj = new Date(date._seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('please_sign_in_journal')}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Password Input Modal */}
      {showPasswordInput && (
        <PasswordInput
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
          title={passwordAction === 'create' ? 'Create Journal Password' : 'Enter Journal Password'}
          isNewPassword={passwordAction === 'create'}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              📖 {t('my_journal')}
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('journal_description')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <button
              onClick={() => navigate('/chat')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              💬 {t('back_to_chat')}
            </button>
          </div>
            <div className="text-right">
              {userPassword ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <span>🔒</span>
                  <span className="text-sm font-medium">{t('encrypted')}</span>
                  <span className="text-xs text-gray-500">
                    {t('auto_clear_30min')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-orange-600">
                  <span>🔓</span>
                  <span className="text-sm font-medium">{t('password_required')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Journal Streak & Rewards Section */}
        {journalMetrics && (
          <div className={`mb-8 p-8 rounded-3xl shadow-xl ${isDark ? 'bg-gradient-to-br from-purple-900/80 to-pink-900/80 border-2 border-purple-700/50' : 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300'} relative overflow-hidden`}>
            {/* Animated pet decoration */}
            <div className="absolute top-4 right-4 text-6xl opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>
              <img src="/dog.gif" alt="dog" className="w-20 h-20" />
            </div>
            
            <div className="flex items-center mb-6 mt-4">
              <span className="text-3xl mr-3">🔥</span>
              <h2 className="text-2xl font-bold text-white">Journal Streak & Rewards</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Current Streak */}
              <div className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-800">
                {/* Animated Background Circle */}
                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-orange-500 to-red-500 transition-transform duration-500 group-hover:scale-[10] opacity-90"></div>
                
                {/* Card Content */}
                <div className="relative z-10 p-6 text-center">
                  {/* Icon */}
                  <div className="mb-4 text-white opacity-90">
                    <div className="text-4xl">🔥</div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2">Current Streak</h3>
                  
                  {/* Value */}
                  <div className="text-white">
                    <div className="text-sm opacity-80 mb-1">Days:</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent group-hover:text-white transition-colors duration-500">
                      {journalMetrics.journal_streak}
                    </div>
                    <div className="text-sm text-orange-300 mt-1">
                      {journalMetrics.journal_streak === 0 ? 'Start today!' : 
                       journalMetrics.journal_streak === 1 ? '1 day' : `${journalMetrics.journal_streak} days`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Progress */}
              <div className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-800">
                {/* Animated Background Circle */}
                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 transition-transform duration-500 group-hover:scale-[10] opacity-90"></div>
                
                {/* Card Content */}
                <div className="relative z-10 p-6 text-center">
                  {/* Icon */}
                  <div className="mb-4 text-white opacity-90">
                    <div className="text-4xl">📅</div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2">This Week</h3>
                  
                  {/* Value */}
                  <div className="text-white">
                    <div className="text-sm opacity-80 mb-1">Entries:</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent group-hover:text-white transition-colors duration-500">
                      {journalMetrics.weekly_journal_count}/7
                    </div>
                    <div className="text-sm text-green-300 mt-1">
                      {journalMetrics.weekly_journal_count >= 5 ? '🏆 Active!' : 'Keep going!'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Progress */}
              <div className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-800">
                {/* Animated Background Circle */}
                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 transition-transform duration-500 group-hover:scale-[10] opacity-90"></div>
                
                {/* Card Content */}
                <div className="relative z-10 p-6 text-center">
                  {/* Icon */}
                  <div className="mb-4 text-white opacity-90">
                    <div className="text-4xl">📝</div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2">Today</h3>
                  
                  {/* Value */}
                  <div className="text-white">
                    <div className="text-sm opacity-80 mb-1">Entries:</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent group-hover:text-white transition-colors duration-500">
                      {journalMetrics.journal_entries_today}
                    </div>
                    <div className="text-sm text-blue-300 mt-1">
                      {journalMetrics.journal_entries_today === 0 ? 'No entries yet' : 
                       journalMetrics.journal_entries_today === 1 ? '1 entry' : `${journalMetrics.journal_entries_today} entries`}
                    </div>
                  </div>
                </div>
              </div>

              {/* WRI Bonus Points */}
              <div className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-800">
                {/* Animated Background Circle */}
                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 transition-transform duration-500 group-hover:scale-[10] opacity-90"></div>
                
                {/* Card Content */}
                <div className="relative z-10 p-6 text-center">
                  {/* Icon */}
                  <div className="mb-4 text-white opacity-90">
                    <div className="text-4xl">💎</div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2">WRI Bonus</h3>
                  
                  {/* Value */}
                  <div className="text-white">
                    <div className="text-sm opacity-80 mb-1">Points:</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent group-hover:text-white transition-colors duration-500">
                      {(() => {
                        // Calculate total journal bonus points based on current metrics
                        let totalBonus = 0;
                        
                        // Base journal bonus
                        if (journalMetrics.journal_entries_today > 0) {
                          totalBonus += 5; // Base 5 points
                        }
                        
                        // Frequency bonus (3 points per entry, max 10)
                        if (journalMetrics.journal_entries_today > 0) {
                          totalBonus += Math.min(10, journalMetrics.journal_entries_today * 3);
                        }
                        
                        // Streak bonus
                        if (journalMetrics.journal_streak >= 1 && journalMetrics.journal_streak < 3) {
                          totalBonus += 2;
                        } else if (journalMetrics.journal_streak >= 3 && journalMetrics.journal_streak < 7) {
                          totalBonus += 8;
                        } else if (journalMetrics.journal_streak >= 7 && journalMetrics.journal_streak < 14) {
                          totalBonus += 15;
                        } else if (journalMetrics.journal_streak >= 14 && journalMetrics.journal_streak < 30) {
                          totalBonus += 25;
                        } else if (journalMetrics.journal_streak >= 30) {
                          totalBonus += 40;
                        }
                        
                        // Weekly frequency bonus (2 points per weekly entry, max 15, minimum 3 entries)
                        if (journalMetrics.weekly_journal_count >= 3) {
                          totalBonus += Math.min(15, journalMetrics.weekly_journal_count * 2);
                        }
                        
                        return totalBonus;
                      })()}
                    </div>
                    <div className="text-sm text-yellow-300 mt-1">
                      {journalMetrics.journal_entries_today > 0 ? 'Points Earned!' :
                       journalMetrics.journal_streak >= 1 ? 'Streak Active!' : 'Start journaling!'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Towards Next Milestone */}
            <div className="mt-6 bg-gray-700/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Next Milestone</span>
                <span className="text-gray-300 text-sm">
                  {journalMetrics.journal_streak >= 30 ? '🏆 Max streak bonus reached!' :
                   journalMetrics.journal_streak >= 14 ? `${30 - journalMetrics.journal_streak} days to Master (40 pts)` :
                   journalMetrics.journal_streak >= 7 ? `${14 - journalMetrics.journal_streak} days to Champion (25 pts)` :
                   journalMetrics.journal_streak >= 3 ? `${7 - journalMetrics.journal_streak} days to Hero (15 pts)` :
                   journalMetrics.journal_streak >= 1 ? `${3 - journalMetrics.journal_streak} days to Rising (8 pts)` :
                   `Start journaling to begin earning rewards!`}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (journalMetrics.journal_streak / (
                      journalMetrics.journal_streak >= 30 ? 30 :
                      journalMetrics.journal_streak >= 14 ? 30 :
                      journalMetrics.journal_streak >= 7 ? 14 :
                      journalMetrics.journal_streak >= 3 ? 7 : 3
                    )) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Journal List */}
          <div className={`lg:col-span-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('your_entries')}
              </h2>
              <button
                onClick={handleNewJournal}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                + {t('new_entry')}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t('loading')}</p>
              </div>
            ) : journals.length === 0 ? (
              <div className="text-center py-8">
                <div className={`inline-block p-6 rounded-3xl ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <img 
                    src="/Logo.png" 
                    alt="Manoday Logo" 
                    className={`h-16 w-16 mx-auto mb-4 object-contain ${
                      isDark ? 'opacity-60' : 'opacity-40'
                    }`}
                  />
                  <h3 className={`text-lg font-bold mb-2 ${
                    isDark ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {t('no_journal_entries')}
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Start your first journal entry above
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {journals.map((journal, index) => (
                  <div
                    key={journal.id}
                    className={`group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
                      selectedJournal?.id === journal.id
                        ? 'ring-2 ring-purple-500'
                        : isDark ? 'bg-gray-800' : 'bg-gray-900'
                    }`}
                    onClick={async () => {
                      console.log('📖 Journal selected:', journal);
                      setSelectedJournal(journal);
                      
                      // Decrypt the journal data for display
                      if (userPassword) {
                        await decryptJournalData(journal);
                      } else {
                        // If no password, show encrypted data
                        setDecryptedJournal(null);
                      }
                    }}
                  >
                    {/* Animated Background Circle */}
                    <div
                      className={`absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br ${
                        selectedJournal?.id === journal.id
                          ? 'from-purple-500 to-indigo-500'
                          : 'from-blue-500 to-purple-500'
                      } transition-transform duration-500 group-hover:scale-[10] opacity-90`}
                    ></div>

                    {/* Card Content */}
                    <div className="relative z-10 p-6">
                      {/* Icon */}
                      <div className="mb-4 text-white opacity-90">
                        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-lg mb-2">
                        {t('encrypted_journal_entry')}
                      </h3>

                      {/* Date */}
                      <div className="text-white">
                        <div className="text-sm opacity-80 mb-1">Created:</div>
                        <div className="text-sm font-medium">
                          {formatDate(journal.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Journal Editor */}
          <div className={`lg:col-span-2 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            {isCreating || isEditing ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {isCreating ? t('create_new_entry') : t('edit_entry')}
                  </h2>
                  <div className="space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={isCreating ? handleCreateJournal : handleUpdateJournal}
                      disabled={loading || !title.trim() || !content.trim()}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {loading ? t('save') : isCreating ? t('create') : t('update')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      {t('title')}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={journalConfig.validation.maxTitleLength}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder={t('enter_journal_title')}
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {title.length}/{journalConfig.validation.maxTitleLength} {t('characters')}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      {t('content')}
                    </label>
                    
                    {/* Voice Recorder */}
                    <div className="mb-4">
                      <VoiceRecorder
                        onTranscript={(transcript) => {
                          setContent(prev => prev + (prev ? '\n\n' : '') + transcript);
                        }}
                        onError={(error) => {
                          setError(error);
                        }}
                        disabled={loading}
                      />
                    </div>
                    
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={journalConfig.validation.maxContentLength}
                      rows={15}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder={t('write_thoughts')}
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {content.length}/{journalConfig.validation.maxContentLength} {t('characters')}
                    </p>
                  </div>
                </div>
              </div>
            ) : selectedJournal ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {decryptedJournal?.title || selectedJournal.title}
                  </h2>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditJournal(selectedJournal)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteJournal(selectedJournal.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>

                <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('created')}: {formatDate(selectedJournal.createdAt)}
                  {(() => {
                    const createdAt = selectedJournal.createdAt as any;
                    const updatedAt = selectedJournal.updatedAt as any;
                    const createdTime = createdAt && typeof createdAt === 'object' && createdAt._seconds 
                      ? createdAt._seconds * 1000 
                      : new Date(createdAt).getTime();
                    const updatedTime = updatedAt && typeof updatedAt === 'object' && updatedAt._seconds 
                      ? updatedAt._seconds * 1000 
                      : new Date(updatedAt).getTime();
                    return createdTime !== updatedTime;
                  })() && (
                    <span> • {t('updated')}: {formatDate(selectedJournal.updatedAt)}</span>
                  )}
                </div>

                <div className={`prose max-w-none ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {decryptedJournal ? (
                    <div className="whitespace-pre-wrap">{decryptedJournal.content}</div>
                  ) : userPassword ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p>{t('decrypting_content')}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🔒</div>
                      <p className="text-orange-600 font-medium">{t('encrypted_content')}</p>
                      <p className="text-sm mt-2">{t('enter_password_to_view')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('select_journal_entry')}
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('choose_entry_or_create')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
