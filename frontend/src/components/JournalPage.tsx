import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { JournalService } from '../services/JournalService';
import { JournalEntry } from '../types/JournalTypes';
import { journalConfig } from '../config/journalConfig';
import VoiceRecorder from './VoiceRecorder';
import { PasswordInput } from './PasswordInput';
import { SecurePasswordStorage } from '../services/SecurePasswordStorage';

const JournalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
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

  const journalService = new JournalService();

  useEffect(() => {
    if (currentUser?.email) {
      loadJournals();
      
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
        setSuccess('Journal entry created and encrypted successfully!');
        setTitle('');
        setContent('');
        setIsCreating(false);
        loadJournals();
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
            Please sign in to access your journal
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
                📖 My Journal
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Write down your thoughts, feelings, and experiences in your personal space.
              </p>
            </div>
            <div className="text-right">
              {userPassword ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <span>🔒</span>
                  <span className="text-sm font-medium">Encrypted</span>
                  <span className="text-xs text-gray-500">
                    (Auto-clear in 30min)
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-orange-600">
                  <span>🔓</span>
                  <span className="text-sm font-medium">Password Required</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Journal List */}
          <div className={`lg:col-span-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Entries
              </h2>
              <button
                onClick={handleNewJournal}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + New Entry
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
              </div>
            ) : journals.length === 0 ? (
              <div className="text-center py-8">
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  No journal entries yet. Create your first entry!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {journals.map((journal) => (
                  <div
                    key={journal.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedJournal?.id === journal.id
                        ? 'border-blue-500 bg-blue-50'
                        : isDark
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
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
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {journal.title}
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(journal.createdAt)}
                    </p>
                    <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {journal.content.substring(0, 100)}...
                    </p>
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
                    {isCreating ? 'Create New Entry' : 'Edit Entry'}
                  </h2>
                  <div className="space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={isCreating ? handleCreateJournal : handleUpdateJournal}
                      disabled={loading || !title.trim() || !content.trim()}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {loading ? 'Saving...' : isCreating ? 'Create' : 'Update'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      Title
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
                      placeholder="Enter journal title..."
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {title.length}/{journalConfig.validation.maxTitleLength} characters
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      Content
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
                      placeholder="Write your thoughts here or use voice recording above..."
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {content.length}/{journalConfig.validation.maxContentLength} characters
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteJournal(selectedJournal.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Created: {formatDate(selectedJournal.createdAt)}
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
                    <span> • Updated: {formatDate(selectedJournal.updatedAt)}</span>
                  )}
                </div>

                <div className={`prose max-w-none ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {decryptedJournal ? (
                    <div className="whitespace-pre-wrap">{decryptedJournal.content}</div>
                  ) : userPassword ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p>Decrypting journal content...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🔒</div>
                      <p className="text-orange-600 font-medium">Encrypted Content</p>
                      <p className="text-sm mt-2">Enter your password to view this journal entry</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Select a journal entry to read
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Choose an entry from the list or create a new one to get started.
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
