// Core types for the wellness chatbot application

export interface WellnessData {
  mood: string;
  sleepHours: string;
  stressLevel: string;
  academicPressure: string;
  socialSupport: string;
  loneliness: string;
  confidenceLevel: string;
  hobbiesInterest: string;
  opennessToJournaling: string;
  willingForProfessionalHelp: string;
}

export interface GeminiRequest {
  message: string;
  conversationHistory: string[];
  wellnessData: Partial<WellnessData>;
}

export interface GeminiResponse {
  response: string;
  extractedData: Partial<WellnessData>;
  updatedWellnessData: Partial<WellnessData>;
  timestamp: string;
}

export interface AutoMLRequest {
  features: Partial<WellnessData>;
}

export interface AutoMLResponse {
  recommendation: string;
  confidence: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
