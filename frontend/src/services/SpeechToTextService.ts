import { journalConfig } from '../config/journalConfig';

export interface SpeechToTextConfig {
  languageCode: string;
  sampleRateHertz: number;
  encoding: string;
  enableAutomaticPunctuation: boolean;
  model: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class SpeechToTextService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private recognition: any = null;

  constructor() {
    // Initialize Web Speech API as fallback
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !!this.recognition;
  }

  /**
   * Start recording audio using Web Speech API (preferred method)
   */
  async startWebSpeechRecognition(
    onResult: (result: SpeechRecognitionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        onResult({
          transcript: result[0].transcript,
          confidence: result[0].confidence,
          isFinal: true
        });
      } else {
        onResult({
          transcript: result[0].transcript,
          confidence: result[0].confidence,
          isFinal: false
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      onError(`Speech recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    this.recognition.start();
    this.isRecording = true;
  }

  /**
   * Stop Web Speech recognition
   */
  stopWebSpeechRecognition(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  /**
   * Start recording audio for Google Speech-to-Text API
   */
  async startAudioRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      console.log('🎤 Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  }

  /**
   * Stop audio recording and return the audio blob
   */
  async stopAudioRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.isRecording = false;
        console.log('🎤 Audio recording stopped, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      
      // Stop all tracks to release microphone
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    });
  }

  /**
   * Convert audio blob to base64 for Google Speech-to-Text API
   */
  private async audioBlobToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Send audio to Google Speech-to-Text API via backend
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const base64Audio = await this.audioBlobToBase64(audioBlob);
      
      const response = await fetch(`https://us-central1-smart-surf-469908-n0.cloudfunctions.net/speechToText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.email || 'anonymous'
        },
        body: JSON.stringify({
          audio: base64Audio,
          config: {
            languageCode: 'en-US',
            sampleRateHertz: 44100,
            encoding: 'WEBM_OPUS',
            enableAutomaticPunctuation: true,
            model: 'latest_long'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Speech-to-text API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.transcript) {
        return result.data.transcript;
      } else {
        throw new Error(result.error || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
    this.isRecording = false;
  }
}

// Helper function to get current user (needed for API calls)
let currentUser: any = null;
export const setCurrentUser = (user: any) => {
  currentUser = user;
};
