import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SpeechToTextService, setCurrentUser } from '../services/SpeechToTextService';
import { 
  MicrophoneIcon, 
  StopIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscript, 
  onError, 
  disabled = false 
}) => {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const speechService = useRef<SpeechToTextService | null>(null);

  useEffect(() => {
    // Set current user for API calls
    setCurrentUser(currentUser);
    
    // Initialize speech service with current language
    const languageCode = language === 'hi' ? 'hi-IN' : 'en-US';
    speechService.current = new SpeechToTextService(languageCode);
    setIsSupported(speechService.current.isSupported());
  }, [currentUser, language]);

  const startRecording = async () => {
    if (!speechService.current || !speechService.current.isSupported()) {
      onError('Voice recording is not supported in your browser');
      return;
    }

    try {
      setError(null);
      setCurrentTranscript('');
      setIsRecording(true);
      setIsProcessing(false);

      // Try Web Speech API first (faster, real-time)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        await speechService.current.startWebSpeechRecognition(
          (result) => {
            setCurrentTranscript(result.transcript);
            if (result.isFinal) {
              onTranscript(result.transcript);
              setIsRecording(false);
            }
          },
          (error) => {
            setError(error);
            setIsRecording(false);
            onError(error);
          }
        );
      } else {
        // Fallback to audio recording + Google Speech-to-Text API
        await speechService.current.startAudioRecording();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      setIsRecording(false);
      onError(errorMessage);
    }
  };

  const stopRecording = async () => {
    if (!speechService.current || !isRecording) return;

    try {
      setIsProcessing(true);
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // Web Speech API - transcript already received
        speechService.current.stopWebSpeechRecognition();
        setIsRecording(false);
        setIsProcessing(false);
      } else {
        // Audio recording + Google Speech-to-Text API
        const audioBlob = await speechService.current.stopAudioRecording();
        setIsRecording(false);
        
        // Transcribe audio
        const transcript = await speechService.current.transcribeAudio(audioBlob);
        setCurrentTranscript(transcript);
        onTranscript(transcript);
        setIsProcessing(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process recording';
      setError(errorMessage);
      setIsRecording(false);
      setIsProcessing(false);
      onError(errorMessage);
    }
  };

  const clearTranscript = () => {
    setCurrentTranscript('');
    setError(null);
  };

  if (!isSupported) {
    return (
      <div className={`p-4 rounded-xl border transition-colors duration-300 ${
        isDark 
          ? 'bg-red-900/50 border-red-700/50' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <div>
            <p className={`text-sm font-medium transition-colors duration-300 ${
              isDark ? 'text-red-200' : 'text-red-800'
            }`}>
              Voice recording not supported
            </p>
            <p className={`text-xs transition-colors duration-300 ${
              isDark ? 'text-red-300' : 'text-red-600'
            }`}>
              Your browser doesn't support voice recording. Please use a modern browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Microphone Button */}
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={disabled || isProcessing}
          className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-xl ${
            disabled || isProcessing
              ? 'bg-gray-400 cursor-not-allowed opacity-40'
              : isDark
              ? 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-purple-500/50'
              : 'bg-purple-500 hover:bg-purple-600 text-white hover:shadow-purple-400/50'
          }`}
          title={isProcessing ? 'Processing...' : 'Voice to text'}
        >
          <MicrophoneIcon className="h-6 w-6" />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className={`p-4 rounded-2xl transition-all duration-300 shadow-xl ${
            isDark
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/50'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-400/50'
          }`}
          title="Stop recording"
        >
          <div className="relative">
            <StopIcon className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        </button>
      )}

      {/* Error Popup - Only show errors, not recording status or transcript */}
      {error && (
        <div className={`absolute bottom-full left-0 mb-2 px-4 py-2 rounded-lg shadow-xl border-2 max-w-xs animate-slide-up ${
          isDark 
            ? 'bg-red-900/90 border-red-700 text-red-200' 
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <div className="flex items-start justify-between space-x-2">
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isDark 
                  ? 'hover:bg-red-800 text-red-300' 
                  : 'hover:bg-red-100 text-red-600'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceRecorder;
