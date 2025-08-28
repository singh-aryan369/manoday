import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaperAirplaneIcon, LightBulbIcon, HeartIcon } from '@heroicons/react/24/outline';

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
  const { currentUser, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [wellnessData, setWellnessData] = useState<Partial<WellnessData>>({});
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Simplified data extraction - let Gemini handle all the intelligence
  const extractWellnessData = (conversation: string[]): Partial<WellnessData> => {
    const data: Partial<WellnessData> = {};
    
    // Get the most recent user message for better context
    const recentMessage = conversation[conversation.length - 1]?.toLowerCase() || '';
    
    // Handle skip requests immediately
    if (recentMessage.includes('skip') || recentMessage.includes('next question') || 
        recentMessage.includes('i don\'t want to answer') || recentMessage.includes('move on') ||
        recentMessage.includes('pass') || recentMessage.includes('don\'t want to talk about it')) {
      // Return empty data - backend will handle with smart defaults
      return {};
    }
    
    // NO FRONTEND EXTRACTION - Let Gemini handle ALL intelligence
    // This ensures user responses are never overridden by frontend logic
    
    return data;
  };

  // Call Vertex AI Gemini for empathetic response
  const getGeminiResponse = async (userMessage: string, history: string[], wellnessData: Partial<WellnessData>): Promise<{ response: string; extractedData: any; updatedWellnessData: any }> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001'}/your-project-id/us-central1/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: history,
          wellnessData: wellnessData
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001'}/your-project-id/us-central1/automl`, {
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

    // Extract wellness data
    const extractedData = extractWellnessData(newHistory);
    const updatedWellnessData = { ...wellnessData, ...extractedData };
    setWellnessData(updatedWellnessData);

    try {
      // Get empathetic response from Gemini (pass cumulative wellness data, not just extracted)
      const geminiResult = await 
      getGeminiResponse(inputMessage, newHistory, updatedWellnessData);
      
      // Update wellness data with what Gemini extracted
      if (geminiResult.extractedData && Object.keys(geminiResult.extractedData).length > 0) {
        setWellnessData(geminiResult.updatedWellnessData);
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
      const collectedParams = requiredParams.filter(param => updatedWellnessData[param as keyof typeof updatedWellnessData]);
      const hasAllParams = collectedParams.length === 10; // Require ALL 10 parameters
      
      const userAsksForRecommendation = inputMessage.toLowerCase().includes('recommend me') || 
                                        inputMessage.toLowerCase().includes('suggest me') || 
                                        inputMessage.toLowerCase().includes('help me') ||
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
        missing: requiredParams.filter(param => !updatedWellnessData[param as keyof typeof updatedWellnessData]),
        hasAll: hasAllParams,
        currentData: updatedWellnessData
      });
      
      // Trigger AutoML automatically if we have ALL 10 parameters OR if user asks OR if we're very close (9/10)
      const isVeryClose = collectedParams.length >= 9;
      
      // If user asks follow-up questions like "what now", try to trigger recommendation even if missing 1-2 parameters
      const shouldTriggerRecommendation = userAsksForRecommendation || hasAllParams || isVeryClose || 
        (collectedParams.length >= 8 && (inputMessage.toLowerCase().includes('what now') || inputMessage.toLowerCase().includes('now what')));
      
      if (shouldTriggerRecommendation) {
        // If we have all parameters, trigger immediately without delay
        const delay = hasAllParams ? 0 : 1000;
        
        setTimeout(async () => {
          try {
            const recommendation = await getAutoMLRecommendation(updatedWellnessData);
            
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
          } catch (error) {
            console.error('Error getting AutoML recommendation:', error);
          }
        }, delay);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">M</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Manoday</h1>
              <p className="text-sm text-gray-500">Your mental wellness companion</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Welcome, {currentUser?.isAnonymous ? 'Guest' : (currentUser?.displayName || 'Friend')}
              </p>
              <p className="text-xs text-gray-500">
                {currentUser?.isAnonymous ? 'Anonymous & Secure' : 'Secure & Private'}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'recommendation'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'recommendation' && (
                      <LightBulbIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      {message.metadata?.recommendation && (
                        <div className="mt-2 p-2 bg-green-100 rounded border border-green-200">
                          <p className="text-xs font-medium text-green-800">
                            💡 Recommended Activity: {message.metadata.recommendation}
                          </p>
                          <button 
                            className="mt-2 w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                            onClick={() => {
                              // TODO: Navigate to new route when implemented
                              console.log(`Navigate to activity: ${message.metadata?.recommendation}`);
                            }}
                          >
                            {message.metadata?.recommendation}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share how you're feeling..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isTyping}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Wellness Data Display */}
        {Object.keys(wellnessData).length > 0 && (
          <div className="mt-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <HeartIcon className="h-4 w-4 mr-2" />
                Wellness Insights
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(wellnessData).map(([key, value]) => (
                  <div key={key} className="bg-white p-2 rounded border">
                    <span className="font-medium text-blue-700">{key}:</span>
                    <span className="text-blue-600 ml-1">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-6 text-center">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              🔒 Your Privacy is Protected
            </h3>
            <p className="text-xs text-blue-700">
              All conversations are encrypted and anonymous. Your personal information is never stored or shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
