import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FrontendEncryptionService } from '../services/encryption.service';
import { HindiEnglishMappingService, getHindiChatGPTPrompt } from '../services/HindiEnglishMappingService';
import { apiConfig } from '../config/apiConfig';
import VoiceRecorder from './VoiceRecorder';
import { 
  PaperAirplaneIcon, 
  LightBulbIcon, 
  HeartIcon, 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  XMarkIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

// Define message structure
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'message' | 'recommendation';
  metadata?: {
    recommendation?: string;
    confidence?: number;
  };
}

// Define wellness data structure
interface WellnessData {
  mood: string; // 'Happy', 'Sad', 'Anxious', 'Stressed', 'Angry', 'Calm', 'Lonely', 'Neutral'
  sleepHours: string; // Categorical: '0', '3', '6', '7', '8', '10' (as strings)
  stressLevel: string; // 'Low', 'Medium', 'High'
  academicPressure: string; // 'Low', 'Medium', 'High'
  socialSupport: string; // 'Weak', 'Average', 'Strong'
  loneliness: string; // 'Never', 'Sometimes', 'Often'
  confidenceLevel: string; // 'Low', 'Medium', 'High'
  hobbiesInterest: string; // 'Music', 'Sports', 'Reading', 'Travel', 'None'
  opennessToJournaling: string; // 'Yes', 'No'
  willingForProfessionalHelp: string; // 'Yes', 'No'
}

const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [wellnessData, setWellnessData] = useState<Partial<WellnessData>>({});
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [showWellnessPanel, setShowWellnessPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Session management for new chats
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isNewChatSession, setIsNewChatSession] = useState<boolean>(false);
  const [hasStoredWriThisSession, setHasStoredWriThisSession] = useState<boolean>(false);

  // DON'T auto-initialize sessionId on mount - only create when actually storing WRI
  // This prevents duplicate WRI entries on page refresh
  const [storedWellnessData, setStoredWellnessData] = useState<Partial<WellnessData>>({});

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start new chat session
  const startNewChatSession = () => {
    // Generate new sessionId for new chat
    const sessionId = crypto.randomUUID();
    setCurrentSessionId(sessionId);
    setIsNewChatSession(true);
    setHasStoredWriThisSession(false); // Reset storage flag for new session
    
    // Keep stored data for display but start fresh for AI interactions
    setWellnessData({});
    setConversationHistory([]);
    setMessages([]);
    
    console.log('🆕 New chat session started:', { sessionId, storedDataAvailable: Object.keys(storedWellnessData).length > 0 });
  };

  // Helper function to start new session after completion
  const startNewSession = () => {
    const sessionId = crypto.randomUUID();
    setCurrentSessionId(sessionId);
    setHasStoredWriThisSession(false); // Reset for next session
    console.log('🔄 New session prepared for next chat:', { sessionId });
  };

  // Load encrypted insights when user logs in
  useEffect(() => {
    if (currentUser && currentUser.email) {
      loadEncryptedInsights();
    }
  }, [currentUser]);

  // Respond to query params from TopBar actions (MainLayout)
  useEffect(() => {
    try {
      const isNew = searchParams.get('new') === '1';
      const showInsights = searchParams.get('insights') === '1';
      if (isNew) {
        startNewChatSession();
      }
      if (showInsights) {
        setShowWellnessPanel(true);
      }
    } catch (e) {
      // ignore
    }
  }, [searchParams]);

  // Load encrypted wellness insights from backend
  const loadEncryptedInsights = async () => {
    if (!currentUser?.email) return;
    
    try {
      const response = await fetch(apiConfig.getEncryptedInsights, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          includeHistory: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.wellnessData) {
          // Store the loaded data separately for display purposes
          setStoredWellnessData(result.data.wellnessData);
          // Don't set current wellnessData - let new chat start fresh
          console.log('Loaded stored insights for display:', result.data.wellnessData);
        }
      }
    } catch (error) {
      console.error('Error loading encrypted insights:', error);
    }
  };

  // Store encrypted wellness insights to backend
  const storeEncryptedInsights = async (wellnessData: Partial<WellnessData>): Promise<boolean> => {
    if (!currentUser?.email || !FrontendEncryptionService.isSupported()) {
      console.warn('⚠️ Cannot store insights - missing user email or encryption not supported');
      return false;
    }

    try {
      console.log('🔐 Starting encryption and storage process...');
      
      // Encrypt the data on frontend
      const { encryptedData, iv } = await FrontendEncryptionService.encryptWellnessData(wellnessData, currentUser.email);
      
      console.log('✅ Data encrypted successfully, sending to backend...');

      const response = await fetch(apiConfig.storeEncryptedInsights, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          wellnessData: wellnessData,
          sessionId: currentSessionId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Encrypted insights stored successfully:', {
          sessionId: result.sessionId,
          parametersStored: result.parametersStored,
          timestamp: new Date().toISOString()
        });
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to store encrypted insights:', {
          status: response.status,
          error: errorText,
          wellnessData: Object.keys(wellnessData)
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error storing encrypted insights:', error);
      return false;
    }
  };

  // Set welcome message based on user type
  useEffect(() => {
    if (currentUser) {
      const welcomeMessage: Message = {
        id: Date.now(),
        text: currentUser.isAnonymous 
          ? "Hello there! 🌟 I'm so glad you decided to chat anonymously. This is a safe space where you can share anything on your mind without judgment. Your privacy is completely protected. How are you feeling today?"
          : `Hello ${currentUser.displayName || 'friend'}! 🌟 I'm here to support you on your mental wellness journey. This is a safe, confidential space where you can share whatever is on your mind. How are you feeling today?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'message'
      };
      setMessages([welcomeMessage]);
    }
  }, [currentUser]);

  // Call Vertex AI Gemini for empathetic response
  const getGeminiResponse = async (userMessage: string, history: string[], wellnessData: Partial<WellnessData>): Promise<{ response: string; extractedData: any; updatedWellnessData: any }> => {
    try {
      // Get current language and apply Hindi-English mapping if needed
      const currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
      
      // Map Hindi input to English for data processing
      let processedMessage = userMessage;
      let processedWellnessData = wellnessData;
      
      if (currentLanguage === 'hi') {
        // Apply Hindi to English mapping for any wellness data values
        if (wellnessData.mood) {
          processedWellnessData.mood = HindiEnglishMappingService.mapToEnglish('mood', wellnessData.mood);
        }
        if (wellnessData.stressLevel) {
          processedWellnessData.stressLevel = HindiEnglishMappingService.mapToEnglish('stress', wellnessData.stressLevel);
        }
        if (wellnessData.academicPressure) {
          processedWellnessData.academicPressure = HindiEnglishMappingService.mapToEnglish('academic', wellnessData.academicPressure);
        }
        if (wellnessData.socialSupport) {
          processedWellnessData.socialSupport = HindiEnglishMappingService.mapToEnglish('social', wellnessData.socialSupport);
        }
        if (wellnessData.loneliness) {
          processedWellnessData.loneliness = HindiEnglishMappingService.mapToEnglish('loneliness', wellnessData.loneliness);
        }
        if (wellnessData.confidenceLevel) {
          processedWellnessData.confidenceLevel = HindiEnglishMappingService.mapToEnglish('confidence', wellnessData.confidenceLevel);
        }
        if (wellnessData.hobbiesInterest) {
          processedWellnessData.hobbiesInterest = HindiEnglishMappingService.mapToEnglish('hobbies', wellnessData.hobbiesInterest);
        }
        if (wellnessData.opennessToJournaling) {
          processedWellnessData.opennessToJournaling = HindiEnglishMappingService.mapToEnglish('journaling', wellnessData.opennessToJournaling);
        }
        if (wellnessData.willingForProfessionalHelp) {
          processedWellnessData.willingForProfessionalHelp = HindiEnglishMappingService.mapToEnglish('professional', wellnessData.willingForProfessionalHelp);
        }
      }
      
      const response = await fetch(apiConfig.gemini, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: processedMessage,
          conversationHistory: history,
          wellnessData: processedWellnessData,
          language: currentLanguage // Pass language to backend
        })
      });
      
      if (!response.ok) {
        throw new Error('Gemini API call failed');
      }
      
      const result = await response.json();
      
      // Handle new MVC response format: { success: true, data: {...} }
      if (result.success && result.data) {
        // Additional safety: clean any remaining JSON from the response
        let cleanResponse = result.data.response;
        if (typeof cleanResponse === 'string') {
          cleanResponse = cleanResponse
            .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '') // Remove ```json blocks
            .replace(/```\s*\{[\s\S]*?\}\s*```/g, '') // Remove any ``` blocks with JSON
            .replace(/\{[\s\S]*?"extractedData"[\s\S]*?\}/g, '') // Remove any JSON with extractedData
            .replace(/\n\s*\n/g, '\n') // Clean up extra newlines
            .trim();
        }
        
        return {
          response: cleanResponse,
          extractedData: result.data.extractedData || {},
          updatedWellnessData: result.data.updatedWellnessData || wellnessData
        };
      }
      
      // Fallback to old format for backward compatibility
      return {
        response: result.response,
        extractedData: result.extractedData || {},
        updatedWellnessData: result.updatedWellnessData || wellnessData
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback empathetic responses
      return {
        response: getFallbackResponse(userMessage),
        extractedData: {},
        updatedWellnessData: wellnessData
      };
    }
  };

  // Fallback empathetic responses when Gemini is not available
  const getFallbackResponse = (userMessage: string): string => {
    const responses = [
        "Thank you for sharing that with me. Your feelings are completely valid, and I want you to know that you're not alone in this. 💙",
        "I hear you, and I can sense the courage it took to open up. Whatever you're going through, we can work through it together. What feels most overwhelming right now?",
        "That sounds really challenging, and I'm sorry you're experiencing this. You've taken a brave step by reaching out. How can I best support you in this moment?",
        "I appreciate you trusting me with your feelings. Remember, healing isn't linear, and it's perfectly okay to have difficult days. What would bring you even a small sense of comfort right now?",
        "Your emotional experience matters deeply. I'm here to listen without judgment and walk alongside you. Would it help to talk more about what's on your heart?",
        "Thank you for being vulnerable with me. Sometimes just being heard can make a difference. You're showing incredible strength by seeking support. What's one thing that's been weighing on you?",
        "I can feel that you're going through something difficult. Please know that your pain is seen and acknowledged. You deserve compassion and care. How are you taking care of yourself today?",
        "Every feeling you have is important and deserves space. I'm grateful you feel safe sharing here. What would help you feel even a little bit lighter right now?"
      ];
      
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Call AutoML model for activity recommendation
  const getAutoMLRecommendation = async (wellnessData: Partial<WellnessData>): Promise<{ recommendation: string; confidence: number }> => {
    try {
      const response = await fetch(apiConfig.automl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features: wellnessData
        })
      });
      
      if (!response.ok) {
        throw new Error('AutoML API call failed');
      }
      
      const result = await response.json();
      
      // Handle new MVC response format: { success: true, data: {...} }
      if (result.success && result.data) {
        return { 
          recommendation: result.data.recommendation || 'Meditation and Yoga', 
          confidence: result.data.confidence || 0.8 
        };
      }
      
      // Fallback to old format for backward compatibility
      return { 
        recommendation: result.recommendation || 'Meditation and Yoga', 
        confidence: result.confidence || 0.8 
      };
    } catch (error) {
      console.error('AutoML API error:', error);
      // Fallback recommendation based on mood
      return { recommendation: getFallbackRecommendation(wellnessData.mood), confidence: 0.8 };
    }
  };

  // Fallback recommendation when AutoML is not available
  const getFallbackRecommendation = (mood?: string): string => {
    switch (mood?.toLowerCase()) {
      case 'stressed':
      case 'anxious':
        return 'Meditation and Yoga';
      case 'sad':
      case 'depressed':
        return 'Professional Help';
      case 'lonely':
        return 'Hobbies Wanderlust';
      case 'overwhelmed':
        return 'Goal Setting';
      default:
        return 'Journaling';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Update conversation history
    const newHistory = [...conversationHistory, inputMessage];
    setConversationHistory(newHistory);

    try {
      // Get empathetic response from Gemini (pass current wellness data)
      // Use Hindi prompt if language is Hindi
      const geminiResult = await getGeminiResponse(inputMessage, newHistory, wellnessData);
      
      // CRITICAL FIX: Let Gemini control the entire conversation flow
      let finalWellnessData = wellnessData;
      
      if (geminiResult.extractedData && Object.keys(geminiResult.extractedData).length > 0) {
        // Use the updated wellness data from Gemini response
        finalWellnessData = geminiResult.updatedWellnessData;
        
        // Update frontend state with the new data
        setWellnessData(finalWellnessData);
        
        console.log('✅ Gemini data extracted and state updated:', {
          extractedData: geminiResult.extractedData,
          finalWellnessData: finalWellnessData,
          previousData: wellnessData
        });
        
        // Store insights during the session to maintain database state
        // ONLY store when we have 4+ meaningful parameters AND haven't stored yet this session
        const meaningfulParamCount = Object.values(finalWellnessData).filter(val => 
          val !== null && val !== undefined && val !== '' && val !== 'undefined'
        ).length;
        
        if (currentUser?.email && meaningfulParamCount >= 4 && !hasStoredWriThisSession) {
          // Create sessionId ONLY when first storing WRI (not on mount/refresh)
          if (!currentSessionId) {
            const newSessionId = crypto.randomUUID();
            setCurrentSessionId(newSessionId);
            console.log(`💾 Creating NEW session for WRI storage: ${newSessionId}`);
          }
          
          console.log(`💾 Storing WRI session ONCE (${meaningfulParamCount} parameters collected)`);
          const storageSuccess = await storeEncryptedInsights(finalWellnessData);
          if (storageSuccess) {
            setHasStoredWriThisSession(true); // Mark as stored to prevent duplicates
            console.log('✅ WRI stored successfully - will not store again this session');
          } else {
            console.warn('⚠️ Failed to store encrypted insights, but continuing with conversation');
          }
        } else if (hasStoredWriThisSession) {
          console.log(`⏭️ Skipping WRI storage - already stored this session`);
        } else if (meaningfulParamCount < 4) {
          console.log(`⏭️ Skipping WRI storage (only ${meaningfulParamCount} parameters, need 4+)`);
        }
      } else {
        console.log('⚠️ No data extracted from Gemini response - this should not happen with proper prompt');
        
        // REMOVED: Frontend fallback extraction - let Gemini handle everything
        // The fallback system was interrupting Gemini's natural conversation flow
        console.log('🔄 Letting Gemini continue the conversation naturally without fallback interruption');
      }
      
      const botMessage: Message = {
        id: Date.now() + 1,
        text: geminiResult.response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'message'
      };

      setMessages(prev => [...prev, botMessage]);

      // Check if we have ALL 10 parameters for AutoML recommendation
      const requiredParams = ['mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'];
      const collectedParams = requiredParams.filter(param => finalWellnessData[param as keyof typeof finalWellnessData]);
      const hasAllParams = collectedParams.length === 10; // Require ALL 10 parameters
      
      const userAsksForRecommendation = inputMessage.toLowerCase().includes('recommend me') || 
                                        inputMessage.toLowerCase().includes('suggest me') || 
                                        inputMessage.toLowerCase().includes('help me') ||
                                        inputMessage.toLowerCase().includes('you tell me') ||
                                        inputMessage.toLowerCase().includes('any activity') ||
                                        inputMessage.toLowerCase().includes('recommend') ||
                                        inputMessage.toLowerCase().includes('suggest') ||
                                        inputMessage.toLowerCase().includes('what now') ||
                                        inputMessage.toLowerCase().includes('now what') ||
                                        inputMessage.toLowerCase().includes('what next') ||
                                        inputMessage.toLowerCase().includes('next step');
      
      // Log parameter collection status for debugging
      console.log('Parameter collection status:', {
        collected: collectedParams.length,
        total: requiredParams.length,
        missing: requiredParams.filter(param => !finalWellnessData[param as keyof typeof finalWellnessData]),
        hasAll: hasAllParams,
        currentData: finalWellnessData
      });
      
      // STRICT RULE: Only trigger AutoML when ALL 10 parameters are collected OR user explicitly asks
      const shouldTriggerRecommendation = userAsksForRecommendation || hasAllParams;
      
      if (shouldTriggerRecommendation) {
        // AutoML trigger logic: ALL parameters OR user explicitly asks
        if (hasAllParams || userAsksForRecommendation) {
          setTimeout(async () => {
            try {
              // If user asks manually but we don't have all parameters, use fallback values
              let dataForAutoML = finalWellnessData;
              if (userAsksForRecommendation && !hasAllParams) {
                dataForAutoML = getFallbackWellnessData(finalWellnessData);
                console.log('🔄 User asked for recommendation - using fallback values for AutoML:', dataForAutoML);
              }
              
              const recommendation = await getAutoMLRecommendation(dataForAutoML);
              
              console.log('🎯 Generated recommendation:', recommendation);
              console.log('🎯 Recommendation text:', recommendation.recommendation);
              console.log('🎯 Is Professional Help?', recommendation.recommendation === 'Professional Help');
              
              const recommendationMessage: Message = {
                id: Date.now() + 2,
                text: hasAllParams 
                  ? `Perfect! We've covered everything I needed to know. Based on our conversation, I think this might help you: **${recommendation.recommendation}** 💡`
                  : `Based on our conversation, I think this might help you: **${recommendation.recommendation}** 💡`,
                sender: 'bot',
                timestamp: new Date(),
                type: 'recommendation',
                metadata: { recommendation: recommendation.recommendation, confidence: recommendation.confidence }
              };

              setMessages(prev => [...prev, recommendationMessage]);
              
              // After recommendation is generated, store final insights and start new session
              if (currentUser?.email) {
                await storeEncryptedInsights(finalWellnessData);
                startNewSession();
                console.log('✅ Session completed - insights stored and new session prepared');
              }
            } catch (error) {
              console.error('Error getting AutoML recommendation:', error);
            }
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I'm having trouble processing that right now. Could you try rephrasing?",
        sender: 'bot',
        timestamp: new Date(),
        type: 'message'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Get fallback wellness data for AutoML when user asks manually but we don't have all parameters
  const getFallbackWellnessData = (currentData: Partial<WellnessData>): Partial<WellnessData> => {
    const fallbackData = {
      mood: currentData.mood || 'Neutral',
      sleepHours: currentData.sleepHours || '7',
      stressLevel: currentData.stressLevel || 'Medium',
      academicPressure: currentData.academicPressure || 'Medium',
      socialSupport: currentData.socialSupport || 'Average',
      loneliness: currentData.loneliness || 'Sometimes',
      confidenceLevel: currentData.confidenceLevel || 'Medium',
      hobbiesInterest: currentData.hobbiesInterest || 'None',
      opennessToJournaling: currentData.opennessToJournaling || 'Yes',
      willingForProfessionalHelp: currentData.willingForProfessionalHelp || 'Yes'
    };
    
    console.log('🔄 Generated fallback wellness data for AutoML:', fallbackData);
    return fallbackData;
  };

  // REMOVED: Frontend fallback data extraction - letting Gemini handle everything naturally
  // This was interrupting Gemini's conversation flow and causing the fallback question issue

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
    }`}>
      {/* TopBar is rendered by the MainLayout parent route; do not render it here to avoid duplication */}
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Chat Container */}
          <div className="lg:col-span-3">
            <div className={`rounded-3xl shadow-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden h-[700px] ${
              isDark 
                ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700' 
                : 'bg-gradient-to-b from-white to-gray-50 border-gray-200'
            }`}>
              
              {/* Chat Header */}
              <div className={`px-6 py-4 border-b-2 backdrop-blur-lg ${
                isDark 
                  ? 'bg-gray-800/95 border-gray-700' 
                  : 'bg-white/95 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* AI Avatar with Glow */}
                    <div className="relative">
                      <div className="h-14 w-14 rounded-2xl bg-purple-200 flex items-center justify-center shadow-xl pulse-glow overflow-hidden">
                        <img 
                          src="/Logo.png" 
                          alt="Manoday Logo" 
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                      {/* Online Status */}
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-gray-800 animate-pulse"></div>
                    </div>
                    
                    {/* Bot Info */}
                    <div>
                      <h2 className={`text-xl font-bold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Manoday AI
                      </h2>
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className={`text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Always here to help
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Insights Toggle */}
                  <button
                    onClick={() => setShowWellnessPanel(!showWellnessPanel)}
                    className={`lg:hidden p-2.5 rounded-xl transition-all hover:scale-110 ${
                      isDark 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <img 
                      src="/Logo.png" 
                      alt="Manoday Logo" 
                      className="h-5 w-5 object-contain"
                    />
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="chat-messages flex-1 overflow-y-auto p-6 space-y-6 h-[500px]">
                {/* Welcome Screen - Empty State */}
                {messages.length === 0 && !isTyping && (
                  <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                    {/* Floating Particles */}
                    <div className="relative mb-10">
                      <div className="h-28 w-28 rounded-3xl bg-purple-200 flex items-center justify-center shadow-2xl overflow-hidden">
                        <img 
                          src="/Logo.png" 
                          alt="Manoday Logo" 
                          className="h-20 w-20 object-contain"
                        />
                      </div>
                      <div className="absolute -top-3 -right-3 h-8 w-8 bg-yellow-400 rounded-full float-particle" style={{ animationDelay: '0s' }}></div>
                      <div className="absolute -bottom-3 -left-3 h-6 w-6 bg-pink-400 rounded-full float-particle" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute top-2 -left-6 h-4 w-4 bg-blue-400 rounded-full float-particle" style={{ animationDelay: '1s' }}></div>
                      <div className="absolute bottom-2 -right-6 h-5 w-5 bg-green-400 rounded-full float-particle" style={{ animationDelay: '1.5s' }}></div>
                    </div>

                    {/* Welcome Text */}
                    <h2 className="text-4xl font-bold mb-4 gradient-text">
                      Welcome to Manoday
                    </h2>
                    <p className={`text-lg text-center mb-10 max-w-lg ${
                      isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Your personal wellness companion. Share your feelings, track your mood, and get personalized support.
                    </p>

                    {/* Quick Start Suggestions */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                      {[
                        { text: 'How am I feeling?', icon: '😊' },
                        { text: 'Tell me about my day', icon: '📝' },
                        { text: 'I need support', icon: '🤗' },
                        { text: 'Track my wellness', icon: '📊' }
                      ].map((item, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(item.text)}
                          className={`group p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                            isDark 
                              ? 'bg-gray-800 border-gray-700 hover:border-purple-500 hover:bg-gray-750' 
                              : 'bg-white border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                          }`}
                        >
                          <div className="text-3xl mb-2">{item.icon}</div>
                          <p className={`text-sm font-medium ${
                            isDark ? 'text-gray-200 group-hover:text-purple-300' : 'text-gray-700 group-hover:text-purple-600'
                          }`}>
                            {item.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Indicator */}
                {isNewChatSession && messages.length > 0 && (
                  <div className={`text-center py-3 px-4 rounded-2xl border-2 transition-all duration-300 message-animate ${
                    isDark 
                      ? 'bg-blue-900/30 border-blue-700 text-blue-200' 
                      : 'bg-blue-50 border-blue-300 text-blue-800'
                  }`}>
                    <div className="flex items-center justify-center space-x-2">
                      <ChatBubbleLeftRightIcon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{t('new_chat_session_started')}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {t('previous_insights_displayed')}
                    </p>
                  </div>
                )}

                {/* Messages */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 message-animate ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar (Left) */}
                    {message.sender === 'bot' && (
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-purple-200 flex items-center justify-center shadow-lg overflow-hidden">
                          <img 
                            src="/Logo.png" 
                            alt="Manoday Logo" 
                            className="h-7 w-7 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className="flex flex-col max-w-[75%]">
                      {/* Sender Name */}
                      {message.sender === 'bot' && (
                        <span className={`text-xs font-medium mb-1 px-1 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Manoday AI
                        </span>
                      )}

                      <div
                        className={`px-5 py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                        message.sender === 'user'
                            ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 text-white rounded-br-md'
                          : message.type === 'recommendation'
                            ? isDark
                              ? 'bg-gradient-to-br from-green-900/60 to-emerald-900/60 border-2 border-green-600 text-green-100 rounded-bl-md'
                              : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 text-green-900 rounded-bl-md'
                          : isDark
                            ? 'bg-gray-800 border-2 border-gray-700 text-gray-100 rounded-bl-md'
                            : 'bg-white border-2 border-gray-200 text-gray-900 rounded-bl-md'
                      }`}
                    >
                        {/* Recommendation Badge */}
                        {message.type === 'recommendation' && (
                          <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-current opacity-60">
                            <LightBulbIcon className="h-5 w-5" />
                            <span className="text-xs font-bold uppercase tracking-wide">AI Recommendation</span>
                          </div>
                        )}

                        {/* Message Text */}
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>

                        {/* Recommendation Action */}
                          {message.metadata?.recommendation && (
                          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                              <button 
                              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.03] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                                onClick={() => {
                                  const recommendation = message.metadata?.recommendation;
                                  console.log('🔍 Button clicked! Recommendation:', recommendation);
                                  
                                  if (recommendation === 'Professional Help') {
                                    console.log('✅ Navigating to professional help page...');
                                    navigate('/professionalHelp');
                                  } else if (recommendation === 'Journaling' || recommendation === 'Journal') {
                                    console.log('✅ Navigating to journaling page...');
                                    navigate('/journal');
                                  } else if (recommendation === 'Meditation and Yoga' || recommendation?.toLowerCase().includes('meditation')) {
                                    console.log('✅ Navigating to meditation and yoga page...');
                                    navigate('/meditation-yoga');
                                  } else if (recommendation === 'Goal Setting') {
                                    console.log('✅ Navigating to goal tracker page...');
                                    navigate('/goal-tracker');
                                  } else if (recommendation === 'Hobbies Wanderlust') {
                                    console.log('✅ Navigating to hobbies recommendations page...');
                                    navigate('/hobbies/recommendations');
                                  } else {
                                    console.log(`Navigate to activity: ${recommendation}`);
                                  }
                                }}
                              >
                              <span>Try {message.metadata?.recommendation}</span>
                              <img 
                                src="/Logo.png" 
                                alt="Manoday Logo" 
                                className="h-4 w-4 object-contain"
                              />
                              </button>
                            </div>
                          )}
                        </div>

                      {/* Timestamp */}
                      <span className={`text-xs mt-2 px-1 ${
                        message.sender === 'user' 
                          ? 'text-purple-300 text-right' 
                          : isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* User Avatar (Right) */}
                    {message.sender === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg border-2 border-purple-500">
                          <span className="text-white font-bold text-sm">
                            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3 message-animate">
                    {/* Bot Avatar */}
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-purple-200 flex items-center justify-center shadow-lg overflow-hidden">
                        <img 
                          src="/Logo.png" 
                          alt="Manoday Logo" 
                          className="h-7 w-7 object-contain animate-pulse"
                        />
                      </div>
                    </div>

                    {/* Typing Bubble */}
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium mb-1 px-1 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Manoday AI
                      </span>
                      <div className={`px-6 py-4 rounded-2xl rounded-bl-md shadow-lg border-2 ${
                      isDark 
                          ? 'bg-gray-800 border-gray-700' 
                          : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full typing-dot-1 ${
                            isDark ? 'bg-purple-400' : 'bg-purple-600'
                          }`}></div>
                          <div className={`w-3 h-3 rounded-full typing-dot-2 ${
                            isDark ? 'bg-pink-400' : 'bg-pink-600'
                          }`}></div>
                          <div className={`w-3 h-3 rounded-full typing-dot-3 ${
                            isDark ? 'bg-indigo-400' : 'bg-indigo-600'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Modern Input Area */}
              <div className={`border-t-2 px-6 py-5 backdrop-blur-lg transition-colors duration-300 ${
                isDark 
                  ? 'bg-gray-800/95 border-gray-700' 
                  : 'bg-white/95 border-gray-200'
              }`}>
                <div className="flex items-end space-x-3">
                  {/* Voice Recorder Button - Wrapped with custom styling */}
                  <div className="relative self-center">
                    <div className="mb-1">
                      <VoiceRecorder
                        onTranscript={(transcript) => {
                          setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
                        }}
                        onError={(error) => {
                          console.error('Voice recording error:', error);
                        }}
                        disabled={isTyping}
                      />
                    </div>
                  </div>

                  {/* Textarea Container */}
                  <div className="flex-1 relative">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message here..."
                      className={`w-full px-5 py-4 pr-12 border-2 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 resize-none shadow-lg transition-all duration-300 ${
                        isDark 
                          ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus:bg-gray-850' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:bg-gray-50'
                      }`}
                      rows={1}
                      style={{
                        minHeight: '56px',
                        maxHeight: '140px'
                      }}
                      disabled={isTyping}
                    />
                    {/* Character Count */}
                    {inputMessage.length > 0 && (
                      <span className={`absolute bottom-3 right-3 text-xs font-medium ${
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {inputMessage.length}
                      </span>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className={`p-4 rounded-2xl transition-all duration-300 transform shadow-xl ${
                      !inputMessage.trim() || isTyping
                        ? 'bg-gray-400 cursor-not-allowed opacity-40'
                        : 'bg-purple-500 hover:bg-purple-600 hover:scale-110 hover:shadow-2xl hover:rotate-12'
                    }`}
                    title="Send message"
                  >
                    <PaperAirplaneIcon className="h-6 w-6 text-white" />
                  </button>
                </div>

                {/* Helper Text */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className={`text-xs flex items-center space-x-2 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <span>Press</span>
                    <kbd className={`px-2 py-1 text-xs font-semibold rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'
                    }`}>
                      Enter
                    </kbd>
                    <span>to send</span>
                  </div>
                  <div className={`text-xs flex items-center ${
                    isDark ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    <img 
                      src="/Logo.png" 
                      alt="Manoday Logo" 
                      className="h-4 w-4 inline mr-1 object-contain opacity-60"
                    />
                    <span>Your wellness matters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wellness Insights Panel */}
          <div className="lg:col-span-1">
            <div className={`rounded-3xl shadow-2xl border-2 transition-all duration-300 overflow-hidden ${
              showWellnessPanel ? 'block' : 'hidden lg:block'
            } ${
              isDark 
                ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700' 
                : 'bg-gradient-to-b from-white to-gray-50 border-gray-200'
            }`}>
              {/* Insights Header */}
              <div className={`px-6 py-5 border-b-2 backdrop-blur-lg sticky top-0 z-10 ${
                isDark 
                  ? 'bg-gray-800/95 border-gray-700' 
                  : 'bg-white/95 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-200 flex items-center justify-center shadow-lg overflow-hidden">
                      <img 
                        src="/Logo.png" 
                        alt="Manoday Logo" 
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Insights
                </h3>
                      <p className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Real-time tracking
                      </p>
                    </div>
                  </div>
                <button
                  onClick={() => setShowWellnessPanel(false)}
                    className={`lg:hidden p-2 rounded-xl transition-all hover:scale-110 ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
                </div>
              </div>

              {/* Insights Content */}
              <div className="p-6 max-h-[690px] overflow-y-auto chat-messages">

              {Object.keys(wellnessData).length > 0 || Object.keys(storedWellnessData).length > 0 ? (
                <div className="space-y-4">
                  {/* Current Chat Data */}
                  {Object.keys(wellnessData).length > 0 && (
                    <>
                      <div className={`text-sm font-bold text-center py-3 px-4 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                        isDark 
                          ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-blue-100 border-blue-700' 
                          : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-blue-300'
                      }`}>
                        <div className="flex items-center justify-center space-x-2">
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          <span>Current Chat</span>
                        </div>
                      </div>
                      {Object.entries(wellnessData)
                        .filter(([key]) => !key.includes('journal') && !key.includes('Journal'))
                        .map(([key, value]) => (
                        <div className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-102 hover:shadow-xl ${
                          isDark 
                            ? 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-700' 
                            : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                        }`} key={key}>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold capitalize transition-colors duration-300 ${
                              isDark ? 'text-blue-200' : 'text-blue-900'
                            }`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`text-sm font-semibold px-2 py-1 rounded-lg transition-colors duration-300 ${
                              isDark 
                                ? 'text-blue-200 bg-gray-700' 
                                : 'text-blue-600 bg-white'
                            }`}>
                              {value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Stored Insights */}
                  {Object.keys(storedWellnessData).length > 0 && (
                    <>
                      <div className={`text-sm font-semibold text-center py-2 rounded-lg transition-colors duration-300 ${
                        isDark 
                          ? 'bg-purple-900/50 text-purple-200 border border-purple-700/50' 
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        💾 Stored Insights (Previous Sessions)
                      </div>
                      {Object.entries(storedWellnessData)
                        .filter(([key]) => !key.includes('journal') && !key.includes('Journal')) // Filter out journal-related data
                        .map(([key, value]) => (
                        <div className={`p-4 rounded-xl border transition-colors duration-300 ${
                          isDark 
                            ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-700/50' 
                            : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium capitalize transition-colors duration-300 ${
                              isDark ? 'text-purple-200' : 'text-purple-800'
                            }`}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`text-sm font-semibold px-2 py-1 rounded-lg transition-colors duration-300 ${
                              isDark 
                                ? 'text-purple-200 bg-gray-700' 
                                : 'text-purple-600 bg-white'
                            }`}>
                              {value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <img 
                    src="/Logo.png" 
                    alt="Manoday Logo" 
                    className="h-12 w-12 mx-auto mb-4 object-contain opacity-40"
                  />
                  <p className={`text-sm transition-colors duration-300 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Start chatting to see your wellness insights
                  </p>
                </div>
              )}

              {/* Privacy Notice */}
              <div className={`mt-6 p-4 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                isDark 
                  ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-blue-700' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
              }`}>
                <h4 className={`text-sm font-bold mb-2 flex items-center transition-colors duration-300 ${
                  isDark ? 'text-blue-200' : 'text-blue-900'
                }`}>
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Privacy Protected
                </h4>
                <p className={`text-xs leading-relaxed transition-colors duration-300 ${
                  isDark ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  All wellness insights are encrypted with your email as the key. Even we cannot read your data. 
                  Your chat history is never stored - only encrypted wellness parameters are saved.
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;