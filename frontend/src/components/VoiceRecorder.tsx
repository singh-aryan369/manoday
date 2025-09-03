import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SpeechToTextService, setCurrentUser } from '../services/SpeechToTextService';
import { 
  MicrophoneIcon, 
  StopIcon, 
  SpeakerWaveIcon,
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const speechService = useRef<SpeechToTextService | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Set current user for API calls
    setCurrentUser(currentUser);
    
    // Initialize speech service
    speechService.current = new SpeechToTextService();
    setIsSupported(speechService.current.isSupported());
  }, [currentUser]);

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
    <div className={`p-4 rounded-xl border transition-colors duration-300 ${
      isDark 
        ? 'bg-gray-800/50 border-gray-700/50' 
        : 'bg-white/50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <SpeakerWaveIcon className="h-5 w-5 text-purple-600" />
          <span className={`text-sm font-medium transition-colors duration-300 ${
            isDark ? 'text-gray-200' : 'text-gray-800'
          }`}>
            Voice to Text
          </span>
        </div>
        
        {currentTranscript && (
          <button
            onClick={clearTranscript}
            className={`text-xs px-2 py-1 rounded-lg transition-colors duration-200 ${
              isDark 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex items-center space-x-3 mb-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled || isProcessing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              disabled || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDark
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <MicrophoneIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isProcessing ? 'Processing...' : 'Start Recording'}
            </span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              isDark
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <StopIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Stop Recording</span>
          </button>
        )}

        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className={`text-xs transition-colors duration-300 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Recording...
            </span>
          </div>
        )}
      </div>

      {/* Current Transcript */}
      {currentTranscript && (
        <div className={`p-3 rounded-lg border transition-colors duration-300 ${
          isDark 
            ? 'bg-gray-700/50 border-gray-600/50' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-sm transition-colors duration-300 ${
            isDark ? 'text-gray-200' : 'text-gray-800'
          }`}>
            {currentTranscript}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={`mt-3 p-3 rounded-lg border transition-colors duration-300 ${
          isDark 
            ? 'bg-red-900/50 border-red-700/50' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm transition-colors duration-300 ${
            isDark ? 'text-red-200' : 'text-red-800'
          }`}>
            {error}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className={`mt-3 text-xs transition-colors duration-300 ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {isRecording 
          ? 'Speak clearly into your microphone. Click "Stop Recording" when finished.'
          : 'Click "Start Recording" to begin voice-to-text conversion.'
        }
      </div>
    </div>
  );
};

export default VoiceRecorder;
