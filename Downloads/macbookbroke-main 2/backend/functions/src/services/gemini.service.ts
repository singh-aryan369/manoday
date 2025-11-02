import { GeminiRequest, GeminiResponse, WellnessData } from '../types';
import { config } from '../config';
import * as logger from 'firebase-functions/logger';

export class GeminiService {
  // Track which parameters have been asked to prevent repetition
  private askedParameters: Set<string> = new Set();
  
  // Track current chat session ID to distinguish new chats
  private currentSessionId: string = '';
  
  // Track if this is a new chat session
  private isNewChatSession: boolean = false;

  // Reset asked parameters for new conversation
  private resetAskedParameters(): void {
    this.askedParameters.clear();
    logger.info('Reset asked parameters for new conversation');
  }

  // Start new chat session
  private startNewChatSession(): void {
    this.currentSessionId = Date.now().toString();
    this.isNewChatSession = true;
    this.resetAskedParameters();
    logger.info('🆕 New chat session started:', { sessionId: this.currentSessionId });
  }

  // Check if this is a new chat session
  private checkNewChatSession(conversationHistory: string[]): boolean {
    // Handle undefined/null conversationHistory
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return true;
    }
    
    // If no conversation history, it's a new chat
    if (conversationHistory.length === 0) {
      return true;
    }
    
    // If conversation history is very short (1-2 messages), likely new chat
    if (conversationHistory.length <= 2) {
      return true;
    }
    
    return false;
  }

  async generateResponse(request: GeminiRequest & { language?: string }): Promise<GeminiResponse> {
    // Ensure required parameters are defined
    const conversationHistory = request.conversationHistory || [];
    const wellnessData = request.wellnessData || {};
    const language = request.language || 'en';
    
    try {
      
      // Check if this is a new chat session
      const isNewChat = this.checkNewChatSession(conversationHistory);
      if (isNewChat) {
        this.startNewChatSession();
        logger.info('🆕 New chat session detected - old insights will be displayed but not used for AI decisions');
      }

      // Reset asked parameters if this is a new conversation (first message)
      if (conversationHistory.length === 0) {
        this.resetAskedParameters();
      }

      const GEMINI_API_KEY = config.gemini.apiKey;
      const GEMINI_ENDPOINT = config.gemini.endpoint;
      
      // Debug configuration
      logger.info('🔍 Gemini Configuration Debug:', {
        apiKey: GEMINI_API_KEY ? '✅ Set' : '❌ Missing',
        endpoint: GEMINI_ENDPOINT,
        apiKeyLength: GEMINI_API_KEY?.length || 0
      });
      
      const prompt = this.createEmpatheticPrompt(request.message, conversationHistory, wellnessData, language);
      
      logger.info('Sending prompt to Gemini:', { prompt: prompt.substring(0, 500) + '...' });
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      logger.info('🌐 Making Gemini API request:', {
        url: `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY.substring(0, 10)}...`,
        method: 'POST',
        bodySize: JSON.stringify(requestBody).length
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error:', { status: response.status, error: errorText });
        
        if (response.status === 429) {
          console.log('🚨 QUOTA EXCEEDED - USING FALLBACK RESPONSE 🚨');
          logger.warn('🚨 QUOTA EXCEEDED - USING FALLBACK RESPONSE 🚨');
          const fallbackResponse = await this.getIntelligentFallback(request.message, conversationHistory, wellnessData);
          console.log('📝 FALLBACK RESPONSE:', fallbackResponse);
          logger.info('📝 FALLBACK RESPONSE:', { fallbackResponse });
          return {
            response: fallbackResponse,
            extractedData: {},
            updatedWellnessData: wellnessData,
            timestamp: new Date().toISOString()
          };
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      clearTimeout(timeoutId);
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           await this.getIntelligentFallback(request.message, conversationHistory, wellnessData);
      
      // Calculate next parameter for strict sequential extraction
      const parameterOrder = ['mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'];
      let nextParameter: string | null = null;
      for (const param of parameterOrder) {
        if (!(wellnessData as any)[param]) {
          nextParameter = param;
          break;
        }
      }
      
      // Try to extract data from Gemini response first (using AI intelligence)
      let extractedData = this.parseGeminiResponse(geminiResponse, nextParameter || undefined);
      logger.info('🔍 PARSED GEMINI RESPONSE:', { extractedData, responseLength: geminiResponse.length });
      
      // If Gemini failed to extract data, use intelligent fallback as backup
      if (Object.keys(extractedData).length === 0) {
        logger.info('⚠️ Gemini extraction failed, using intelligent fallback...');
        
        // Use intelligent fallback that maintains conversation flow
        const fallbackResponse = await this.getIntelligentFallback(request.message, conversationHistory, wellnessData);
        return {
          response: fallbackResponse,
          extractedData: {},
          updatedWellnessData: wellnessData,
          timestamp: new Date().toISOString()
        };
      } else {
        logger.info('✅ Gemini successfully extracted data using AI intelligence:', { extractedData });
      }
      
      // Clean Gemini response to remove any JSON or technical content
      let cleanResponse = geminiResponse
        .replace(/\{code\}\s*\{[\s\S]*?\}\s*\{\/code\}/g, '') // Remove {code} blocks
        .replace(/\{[\s\S]*?"extractedData"[\s\S]*?\}/g, '') // Remove any JSON with extractedData
        .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '') // Remove ```json blocks
        .replace(/```\s*\{[\s\S]*?\}\s*```/g, '') // Remove any ``` blocks with JSON
        .replace(/```json\s*\n\}/g, '') // Remove ```json\n} artifacts
        .replace(/```\s*\n\}/g, '') // Remove ```\n} artifacts
        .replace(/\n\s*\n/g, '\n') // Clean up extra newlines
        .trim();
      
      // STRICT RULE: Only allow extraction of current parameter, prevent forward guessing
      const sanitizedData = this.sanitizeExtractedData(extractedData, wellnessData);
      
      // NOW mark the parameter as asked since we successfully extracted data
      if (nextParameter && Object.keys(sanitizedData).length > 0) {
        this.askedParameters.add(nextParameter);
        logger.info(`✅ Parameter ${nextParameter} marked as asked after successful extraction`);
      }
      
      logger.info('Gemini API call successful:', { 
        messageLength: request.message.length, 
        responseLength: geminiResponse.length,
        extractedData: sanitizedData
      });

      return {
        response: cleanResponse,
        extractedData: sanitizedData,
        updatedWellnessData: { ...wellnessData, ...sanitizedData },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log('🚨 GEMINI API ERROR - USING FALLBACK RESPONSE 🚨');
      console.log('❌ Error details:', error);
      logger.error('🚨 GEMINI API ERROR - USING FALLBACK RESPONSE 🚨', error);
      const fallbackResponse = await this.getIntelligentFallback(request.message, conversationHistory, wellnessData);
      console.log('📝 FALLBACK RESPONSE:', fallbackResponse);
      logger.info('📝 FALLBACK RESPONSE:', { fallbackResponse });
      return {
        response: fallbackResponse,
        extractedData: {},
        updatedWellnessData: wellnessData,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Create empathetic prompt for Gemini based on real interview examples
  private createEmpatheticPrompt(message: string, conversationHistory: string[], wellnessData: any, language: string = 'en'): string {
    const history = conversationHistory.join('\n');
    const effectiveWellnessData = wellnessData || {};
    
    // Determine which parameter to collect next - STRICT ORDER ENFORCEMENT
    const parameterOrder = ['mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'];
    
    let nextParameter = null;
    let collectedCount = 0;
    
    // STRICT SEQUENTIAL CHECK - Never skip parameters
    for (const param of parameterOrder) {
      if (effectiveWellnessData[param]) {
        collectedCount++;
        logger.info(`✅ Parameter ${param} already collected: ${effectiveWellnessData[param]}`);
      } else if (!nextParameter) {
        nextParameter = param;
        logger.info(`🎯 NEXT PARAMETER TO COLLECT: ${param} (step ${parameterOrder.indexOf(param) + 1} of 10)`);
        break; // Stop at first missing parameter - don't skip ahead
      }
    }
    
    // WORKFLOW VALIDATION - Ensure we're not jumping around
    if (nextParameter) {
      const expectedIndex = collectedCount;
      const actualIndex = parameterOrder.indexOf(nextParameter);
      if (expectedIndex !== actualIndex) {
        logger.warn(`🚨 WORKFLOW BREACH DETECTED: Expected step ${expectedIndex + 1}, but trying to collect step ${actualIndex + 1}`);
        // Force correct parameter
        nextParameter = parameterOrder[expectedIndex];
        logger.info(`🔧 WORKFLOW CORRECTED: Now collecting ${nextParameter} (step ${expectedIndex + 1})`);
      }
    }
    
    const conversationLength = conversationHistory.length;
    
    // CRITICAL FIX: Prevent mood from being asked repeatedly
    // Only skip if the parameter was already asked AND we have data for it
    if (nextParameter && this.askedParameters.has(nextParameter) && effectiveWellnessData[nextParameter]) {
      logger.info(`Parameter ${nextParameter} already asked and has data - moving to next parameter`);
      
      // Find the next parameter after this one
      let nextNextParameter = null;
      const currentIndex = parameterOrder.indexOf(nextParameter);
      if (currentIndex < parameterOrder.length - 1) {
        nextNextParameter = parameterOrder[currentIndex + 1];
        nextParameter = nextNextParameter;
        logger.info(`Moving from ${parameterOrder[currentIndex]} to ${nextParameter}`);
      } else {
        // If this was the last parameter, we're done
        nextParameter = null;
        logger.info('All parameters collected - moving to recommendation mode');
      }
    }
    
    // Check if user explicitly asks for recommendation
    const userAsksForRecommendation = message.toLowerCase().includes('recommend me') || 
                                    message.toLowerCase().includes('suggest me') || 
                                    message.toLowerCase().includes('help me') ||
                                    message.toLowerCase().includes('you tell me') ||
                                    message.toLowerCase().includes('any activity') ||
                                    message.toLowerCase().includes('recommend') ||
                                    message.toLowerCase().includes('suggest') ||
                                    message.toLowerCase().includes('activity');
    
    if (userAsksForRecommendation) {
      nextParameter = null; // User wants recommendation now
    }

    logger.info('Smart prompt logic:', { 
      collectedCount, 
      conversationLength, 
      nextParameter, 
      willContinueQuestioning: !!nextParameter,
      isNewChatSession: this.isNewChatSession,
      storedDataAvailable: Object.keys(wellnessData).length > 0
    });

    // If user asks for recommendation OR all parameters collected, give brief supportive response
    if (!nextParameter) {
      const basePrompt = `You are a supportive friend responding to someone asking for help.

User's message: "${message}"
What you know about them: ${JSON.stringify(wellnessData)}

CRITICAL INSTRUCTIONS:
1. Provide 6-8 lines of empathetic, caring response
2. Be warm, understanding, and emotionally supportive
3. If they ask for recommendation/activity, acknowledge their request warmly
4. Sound like a caring friend who truly understands their struggles
5. Show genuine empathy and validation of their feelings
6. Be encouraging and hopeful while acknowledging their challenges
7. Give them a sense of hope and support
8. Let them know you're here to help and they're not alone

Remember: Compassionate, empathetic, supportive - like a close friend who truly cares.`;

      // Language-specific prompts
      const languagePrompts: { [key: string]: string } = {
        hi: `आप एक सहायक मित्र हैं जो किसी की मदद के लिए पूछने वाले का जवाब दे रहे हैं।

उपयोगकर्ता का संदेश: "${message}"
आप उनके बारे में जानते हैं: ${JSON.stringify(wellnessData)}

महत्वपूर्ण निर्देश:
1. 6-8 पंक्तियों का सहानुभूतिपूर्ण, देखभाल करने वाला जवाब दें
2. गर्म, समझदार और भावनात्मक रूप से सहायक बनें
3. यदि वे सिफारिश/गतिविधि के लिए पूछते हैं, तो उनके अनुरोध को गर्मजोशी से स्वीकार करें
4. एक देखभाल करने वाले मित्र की तरह लगें जो वास्तव में उनकी समस्याओं को समझता है
5. उनकी भावनाओं की वास्तविक सहानुभूति और सत्यापन दिखाएं
6. उनकी चुनौतियों को स्वीकार करते हुए प्रोत्साहित और आशावादी बनें
7. उन्हें आशा और सहायता का एहसास दिलाएं
8. उन्हें बताएं कि आप यहां मदद के लिए हैं और वे अकेले नहीं हैं

याद रखें: दयालु, सहानुभूतिपूर्ण, सहायक - एक करीबी मित्र की तरह जो वास्तव में परवाह करता है।`,
        
        ta: `நீங்கள் உதவி கேட்கும் ஒருவருக்கு பதிலளிக்கும் ஒரு ஆதரவான நண்பர்.

பயனரின் செய்தி: "${message}"
நீங்கள் அவர்களைப் பற்றி அறிந்தது: ${JSON.stringify(wellnessData)}

முக்கியமான வழிமுறைகள்:
1. 6-8 வரிகளில் பரிவுள்ள, அக்கறையான பதிலை வழங்கவும்
2. சூடான, புரிந்துகொள்ளும் மற்றும் உணர்ச்சி ரீதியாக ஆதரவாக இருங்கள்
3. அவர்கள் பரிந்துரை/செயல்பாட்டிற்கு கேட்டால், அவர்களின் கோரிக்கையை சூடாக ஏற்றுக்கொள்ளுங்கள்
4. அவர்களின் போராட்டங்களை உண்மையாக புரிந்துகொள்ளும் அக்கறையுள்ள நண்பர் போல ஒலிக்கவும்
5. அவர்களின் உணர்வுகளின் உண்மையான பரிவு மற்றும் சரிபார்ப்பைக் காட்டுங்கள்
6. அவர்களின் சவால்களை ஒப்புக்கொள்ளும்போது ஊக்கமளிக்கும் மற்றும் நம்பிக்கையுடன் இருங்கள்
7. அவர்களுக்கு நம்பிக்கை மற்றும் ஆதரவு உணர்வை கொடுங்கள்
8. நீங்கள் உதவ இங்கே இருக்கிறீர்கள் என்றும் அவர்கள் தனியாக இல்லை என்றும் அவர்களுக்கு தெரியப்படுத்துங்கள்

நினைவில் கொள்ளுங்கள்: இரக்கமுள்ள, பரிவுள்ள, ஆதரவான - உண்மையாக அக்கறை கொண்ட நெருங்கிய நண்பர் போல.`,
        
        te: `మీరు సహాయం కోరుతున్న ఒకరికి స్పందించే సహాయక మిత్రుడు.

వినియోగదారు సందేశం: "${message}"
మీరు వారి గురించి తెలుసుకున్నది: ${JSON.stringify(wellnessData)}

క్లిష్టమైన సూచనలు:
1. 6-8 పంక్తుల సానుభూతితో కూడిన, శ్రద్ధగల ప్రతిస్పందనను అందించండి
2. వెచ్చగా, అర్థం చేసుకునే మరియు భావోద్వేగంగా సహాయకారిగా ఉండండి
3. వారు సిఫార్సు/కార్యాచరణ కోసం అడిగితే, వారి అభ్యర్థనను వెచ్చగా స్వీకరించండి
4. వారి పోరాటాలను నిజంగా అర్థం చేసుకునే శ్రద్ధగల మిత్రుడిలా ధ్వనించండి
5. వారి భావాల యొక్క నిజమైన సానుభూతి మరియు ధృవీకరణను చూపండి
6. వారి సవాళ్లను గుర్తించేటప్పుడు ప్రోత్సాహకారిగా మరియు ఆశాజనకంగా ఉండండి
7. వారికి ఆశ మరియు మద్దతు భావాన్ని ఇవ్వండి
8. మీరు సహాయం చేయడానికి ఇక్కడ ఉన్నారని మరియు వారు ఒంటరిగా లేరని వారికి తెలియజేయండి

గుర్తుంచుకోండి: కరుణతో, సానుభూతితో, సహాయకారిగా - నిజంగా శ్రద్ధ వహించే సన్నిహిత మిత్రుడిలా.`,
        
        kn: `ನೀವು ಸಹಾಯಕ್ಕಾಗಿ ಕೇಳುತ್ತಿರುವ ಯಾರಿಗಾದರೂ ಪ್ರತಿಕ್ರಿಯಿಸುವ ಬೆಂಬಲ ಸ್ನೇಹಿತರು.

ಬಳಕೆದಾರರ ಸಂದೇಶ: "${message}"
ನೀವು ಅವರ ಬಗ್ಗೆ ತಿಳಿದಿರುವುದು: ${JSON.stringify(wellnessData)}

ನಿರ್ಣಾಯಕ ಸೂಚನೆಗಳು:
1. 6-8 ಸಾಲುಗಳ ಸಹಾನುಭೂತಿಯುಳ್ಳ, ಕಾಳಜಿಯುಳ್ಳ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ನೀಡಿ
2. ಬೆಚ್ಚಗಿರಿ, ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಮತ್ತು ಭಾವನಾತ್ಮಕವಾಗಿ ಬೆಂಬಲಕಾರಿಯಾಗಿರಿ
3. ಅವರು ಶಿಫಾರಸು/ಚಟುವಟಿಕೆಗಾಗಿ ಕೇಳಿದರೆ, ಅವರ ವಿನಂತಿಯನ್ನು ಬೆಚ್ಚಗೆ ಸ್ವೀಕರಿಸಿ
4. ಅವರ ಹೋರಾಟಗಳನ್ನು ನಿಜವಾಗಿಯೂ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ ಕಾಳಜಿಯುಳ್ಳ ಸ್ನೇಹಿತನಂತೆ ಧ್ವನಿಸಿ
5. ಅವರ ಭಾವನೆಗಳ ನಿಜವಾದ ಸಹಾನುಭೂತಿ ಮತ್ತು ಮೌಲ್ಯೀಕರಣವನ್ನು ತೋರಿಸಿ
6. ಅವರ ಸವಾಲುಗಳನ್ನು ಒಪ್ಪಿಕೊಳ್ಳುವಾಗ ಪ್ರೋತ್ಸಾಹಕಾರಿ ಮತ್ತು ಭರವಸೆಯಿಂದಿರಿ
7. ಅವರಿಗೆ ಭರವಸೆ ಮತ್ತು ಬೆಂಬಲದ ಅರ್ಥವನ್ನು ನೀಡಿ
8. ನೀವು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೀರಿ ಮತ್ತು ಅವರು ಒಂಟಿಯಾಗಿಲ್ಲ ಎಂದು ಅವರಿಗೆ ತಿಳಿಸಿ

ನೆನಪಿಡಿ: ಸಹಾನುಭೂತಿ, ಸಹಾನುಭೂತಿಯುಳ್ಳ, ಬೆಂಬಲಕಾರಿ - ನಿಜವಾಗಿಯೂ ಕಾಳಜಿವಹಿಸುವ ನಿಕಟ ಸ್ನೇಹಿತರಂತೆ.`
      };
      
      return languagePrompts[language] || basePrompt;
    }

    // DON'T mark as asked yet - wait until we successfully extract data
    // this.askedParameters.add(nextParameter); // MOVED TO AFTER SUCCESSFUL EXTRACTION

    const basePrompt = `You are a warm, empathetic AI friend helping track mental wellness. 

🚨 CRITICAL WORKFLOW RULE - NEVER BREAK THIS ORDER:
1. mood → 2. sleepHours → 3. stressLevel → 4. academicPressure → 5. socialSupport → 6. loneliness → 7. confidenceLevel → 8. hobbiesInterest → 9. opennessToJournaling → 10. willingForProfessionalHelp

CURRENT TASK: Collect parameter: ${nextParameter}

USER MESSAGE: "${message}"
CONVERSATION: ${history}
COLLECTED SO FAR: ${JSON.stringify(effectiveWellnessData)}

INSTRUCTIONS:
1. Extract the ${nextParameter} value from the user's response
2. Provide a warm, empathetic response (4-6 lines)
3. Ask about the next parameter naturally but definitely ask for next parameter never get stuck in conversation
4. Return JSON at the end: {code}{"extractedData": {"${nextParameter}": "EXTRACTED_VALUE"}}{/code}

MAPPING GUIDELINES:
${this.getComprehensiveMappingForParameter(nextParameter)}

🚨 WORKFLOW ENFORCEMENT:
- You are currently on parameter ${nextParameter}
- After extracting this parameter, you MUST ask about the next one in sequence
- NEVER skip parameters or jump around
- NEVER ask about a parameter that comes later in the sequence`;

    // Language-specific prompts for parameter collection
    const languagePrompts: { [key: string]: string } = {
      hi: `आप एक गर्म, सहानुभूतिपूर्ण AI मित्र हैं जो मानसिक स्वास्थ्य को ट्रैक करने में मदद कर रहे हैं।

🚨 महत्वपूर्ण वर्कफ्लो नियम - इस क्रम को कभी न तोड़ें:
1. मूड → 2. नींद के घंटे → 3. तनाव स्तर → 4. शैक्षणिक दबाव → 5. सामाजिक सहायता → 6. अकेलापन → 7. आत्मविश्वास स्तर → 8. शौक रुचि → 9. डायरी लेखन के लिए खुलापन → 10. व्यावसायिक सहायता के लिए इच्छा

वर्तमान कार्य: पैरामीटर एकत्र करें: ${nextParameter}

उपयोगकर्ता संदेश: "${message}"
बातचीत: ${history}
अब तक एकत्रित: ${JSON.stringify(effectiveWellnessData)}

निर्देश:
1. उपयोगकर्ता के जवाब से ${nextParameter} मान निकालें
2. एक गर्म, सहानुभूतिपूर्ण जवाब दें (4-6 पंक्तियां)
3. अगले पैरामीटर के बारे में स्वाभाविक रूप से पूछें लेकिन निश्चित रूप से अगले पैरामीटर के बारे में पूछें, बातचीत में फंसें नहीं
4. अंत में JSON लौटाएं: {code}{"extractedData": {"${nextParameter}": "EXTRACTED_VALUE"}}{/code}

मैपिंग दिशानिर्देश:
${this.getComprehensiveMappingForParameter(nextParameter)}

🚨 वर्कफ्लो प्रवर्तन:
- आप वर्तमान में ${nextParameter} पैरामीटर पर हैं
- इस पैरामीटर को निकालने के बाद, आपको क्रम में अगले के बारे में पूछना होगा
- कभी भी पैरामीटर न छोड़ें या इधर-उधर न कूदें
- कभी भी ऐसे पैरामीटर के बारे में न पूछें जो क्रम में बाद में आता है`,

      ta: `நீங்கள் மன நலனைக் கண்காணிக்க உதவும் ஒரு சூடான, பரிவுள்ள AI நண்பர்.

🚨 முக்கியமான பணிப்பாய்வு விதி - இந்த வரிசையை ஒருபோதும் மீறாதீர்கள்:
1. மனநிலை → 2. தூக்க மணிநேரங்கள் → 3. மன அழுத்த நிலை → 4. கல்வி அழுத்தம் → 5. சமூக ஆதரவு → 6. தனிமை → 7. நம்பிக்கை நிலை → 8. பொழுதுபோக்கு ஆர்வம் → 9. பத்திரிகை எழுதுதலுக்கான திறந்த தன்மை → 10. தொழில்முறை உதவிக்கான விருப்பம்

தற்போதைய பணி: அளவுரு சேகரிக்கவும்: ${nextParameter}

பயனர் செய்தி: "${message}"
உரையாடல்: ${history}
இதுவரை சேகரிக்கப்பட்டது: ${JSON.stringify(effectiveWellnessData)}

வழிமுறைகள்:
1. பயனரின் பதிலிலிருந்து ${nextParameter} மதிப்பை பிரித்தெடுக்கவும்
2. ஒரு சூடான, பரிவுள்ள பதிலை வழங்கவும் (4-6 வரிகள்)
3. அடுத்த அளவுருவைப் பற்றி இயற்கையாக கேளுங்கள் ஆனால் நிச்சயமாக அடுத்த அளவுருவைப் பற்றி கேளுங்கள், உரையாடலில் சிக்கிக்கொள்ள வேண்டாம்
4. இறுதியில் JSON ஐ வழங்கவும்: {code}{"extractedData": {"${nextParameter}": "EXTRACTED_VALUE"}}{/code}

மேப்பிங் வழிகாட்டுதல்கள்:
${this.getComprehensiveMappingForParameter(nextParameter)}

🚨 பணிப்பாய்வு அமலாக்கம்:
- நீங்கள் தற்போது ${nextParameter} அளவுருவில் இருக்கிறீர்கள்
- இந்த அளவுருவை பிரித்தெடுத்த பிறகு, நீங்கள் வரிசையில் அடுத்ததைப் பற்றி கேட்க வேண்டும்
- அளவுருக்களைத் தவிர்க்க வேண்டாம் அல்லது குதிக்க வேண்டாம்
- வரிசையில் பின்னர் வரும் அளவுருவைப் பற்றி ஒருபோதும் கேட்க வேண்டாம்`,

      te: `మీరు మానసిక ఆరోగ్యాన్ని ట్రాక్ చేయడంలో సహాయపడే వెచ్చని, సానుభూతిగల AI మిత్రుడు.

🚨 క్లిష్టమైన వర్క్‌ఫ్లో నియమం - ఈ క్రమాన్ని ఎప్పుడూ ఉల్లంఘించవద్దు:
1. మూడ్ → 2. నిద్ర గంటలు → 3. ఒత్తిడి స్థాయి → 4. విద్యా ఒత్తిడి → 5. సామాజిక మద్దతు → 6. ఒంటరితనం → 7. విశ్వాస స్థాయి → 8. అభిరుచుల ఆసక్తి → 9. జర్నలింగ్‌కు ఓపెన్‌నెస్ → 10. వృత్తిపరమైన సహాయానికి సిద్ధత

ప్రస్తుత పని: పరామితిని సేకరించండి: ${nextParameter}

వినియోగదారు సందేశం: "${message}"
సంభాషణ: ${history}
ఇప్పటివరకు సేకరించినది: ${JSON.stringify(effectiveWellnessData)}

సూచనలు:
1. వినియోగదారు ప్రతిస్పందన నుండి ${nextParameter} విలువను సంగ్రహించండి
2. వెచ్చని, సానుభూతితో కూడిన ప్రతిస్పందనను అందించండి (4-6 పంక్తులు)
3. తదుపరి పరామితి గురించి సహజంగా అడగండి కానీ ఖచ్చితంగా తదుపరి పరామితి గురించి అడగండి, సంభాషణలో చిక్కుకోవద్దు
4. చివరలో JSON ను తిరిగి ఇవ్వండి: {code}{"extractedData": {"${nextParameter}": "EXTRACTED_VALUE"}}{/code}

మ్యాపింగ్ మార్గదర్శకాలు:
${this.getComprehensiveMappingForParameter(nextParameter)}

🚨 వర్క్‌ఫ్లో అమలు:
- మీరు ప్రస్తుతం ${nextParameter} పరామితిలో ఉన్నారు
- ఈ పరామితిని సంగ్రహించిన తర్వాత, మీరు క్రమంలో తదుపరి దాని గురించి అడగాలి
- పరామితులను ఎప్పుడూ దాటవద్దు లేదా దూకవద్దు
- క్రమంలో తర్వాత వచ్చే పరామితి గురించి ఎప్పుడూ అడగవద్దు`,

      kn: `ನೀವು ಮಾನಸಿಕ ಆರೋಗ್ಯವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡುವ ಬೆಚ್ಚಗಿನ, ಸಹಾನುಭೂತಿಯುಳ್ಳ AI ಸ್ನೇಹಿತ.

🚨 ನಿರ್ಣಾಯಕ ಕಾರ್ಯಹರಿವು ನಿಯಮ - ಈ ಕ್ರಮವನ್ನು ಎಂದಿಗೂ ಉಲ್ಲಂಘಿಸಬೇಡಿ:
1. ಮೂಡ್ → 2. ನಿದ್ರೆಯ ಗಂಟೆಗಳು → 3. ಒತ್ತಡದ ಮಟ್ಟ → 4. ಶೈಕ್ಷಣಿಕ ಒತ್ತಡ → 5. ಸಾಮಾಜಿಕ ಬೆಂಬಲ → 6. ಏಕಾಂತತೆ → 7. ಆತ್ಮವಿಶ್ವಾಸದ ಮಟ್ಟ → 8. ಹವ್ಯಾಸ ಆಸಕ್ತಿ → 9. ಜರ್ನಲಿಂಗ್‌ಗೆ ಮುಕ್ತತೆ → 10. ವೃತ್ತಿಪರ ಸಹಾಯಕ್ಕೆ ಇಚ್ಛೆ

ಪ್ರಸ್ತುತ ಕಾರ್ಯ: ಪ್ಯಾರಾಮೀಟರ್ ಸಂಗ್ರಹಿಸಿ: ${nextParameter}

ಬಳಕೆದಾರರ ಸಂದೇಶ: "${message}"
ಸಂಭಾಷಣೆ: ${history}
ಇಲ್ಲಿಯವರೆಗೆ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ: ${JSON.stringify(effectiveWellnessData)}

ಸೂಚನೆಗಳು:
1. ಬಳಕೆದಾರರ ಪ್ರತಿಕ್ರಿಯೆಯಿಂದ ${nextParameter} ಮೌಲ್ಯವನ್ನು ಹೊರತೆಗೆಯಿರಿ
2. ಬೆಚ್ಚಗಿನ, ಸಹಾನುಭೂತಿಯುಳ್ಳ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ನೀಡಿ (4-6 ಸಾಲುಗಳು)
3. ಮುಂದಿನ ಪ್ಯಾರಾಮೀಟರ್ ಬಗ್ಗೆ ಸ್ವಾಭಾವಿಕವಾಗಿ ಕೇಳಿ ಆದರೆ ಖಂಡಿತವಾಗಿಯೂ ಮುಂದಿನ ಪ್ಯಾರಾಮೀಟರ್ ಬಗ್ಗೆ ಕೇಳಿ, ಸಂಭಾಷಣೆಯಲ್ಲಿ ಸಿಲುಕಬೇಡಿ
4. ಕೊನೆಯಲ್ಲಿ JSON ಅನ್ನು ಹಿಂತಿರುಗಿಸಿ: {code}{"extractedData": {"${nextParameter}": "EXTRACTED_VALUE"}}{/code}

ಮ್ಯಾಪಿಂಗ್ ಮಾರ್ಗಸೂಚಿಗಳು:
${this.getComprehensiveMappingForParameter(nextParameter)}

🚨 ಕಾರ್ಯಹರಿವು ಜಾರಿ:
- ನೀವು ಪ್ರಸ್ತುತ ${nextParameter} ಪ್ಯಾರಾಮೀಟರ್‌ನಲ್ಲಿದ್ದೀರಿ
- ಈ ಪ್ಯಾರಾಮೀಟರ್ ಅನ್ನು ಹೊರತೆಗೆದ ನಂತರ, ನೀವು ಕ್ರಮದಲ್ಲಿ ಮುಂದಿನದರ ಬಗ್ಗೆ ಕೇಳಬೇಕು
- ಪ್ಯಾರಾಮೀಟರ್‌ಗಳನ್ನು ಎಂದಿಗೂ ದಾಟಬೇಡಿ ಅಥವಾ ಜಿಗಿಯಬೇಡಿ
- ಕ್ರಮದಲ್ಲಿ ನಂತರ ಬರುವ ಪ್ಯಾರಾಮೀಟರ್ ಬಗ್ಗೆ ಎಂದಿಗೂ ಕೇಳಬೇಡಿ`
    };
    
    return languagePrompts[language] || basePrompt;
  }
  private parseGeminiResponse(geminiResponse: string, requestedParameter?: string): Partial<WellnessData> {
    try {
      logger.info(`🎯 PARSING GEMINI RESPONSE for parameter: ${requestedParameter}`);
      logger.info(`📝 Full response: ${geminiResponse}`);
      
      // PRIORITY 1: Look for JSON response (Gemini should return JSON)
      const jsonMatch = geminiResponse.match(/\{code\}\s*(\{[\s\S]*?\})\s*\{\/code\}/);
      if (jsonMatch) {
        try {
        const jsonData = JSON.parse(jsonMatch[1]);
          logger.info(`✅ JSON parsed successfully:`, jsonData);
          
          if (jsonData.extractedData && requestedParameter && jsonData.extractedData[requestedParameter]) {
            const value = jsonData.extractedData[requestedParameter];
            logger.info(`✅ Parameter ${requestedParameter} extracted from JSON: ${value}`);
            return { [requestedParameter]: value };
          }
        } catch (jsonError) {
          logger.warn(`⚠️ JSON parsing failed:`, jsonError);
        }
      }
      
      // PRIORITY 2: Look for inline JSON
      const inlineJsonMatch = geminiResponse.match(/\{[\s\S]*?"extractedData"[\s\S]*?\}/);
      if (inlineJsonMatch) {
        try {
          const jsonData = JSON.parse(inlineJsonMatch[0]);
          logger.info(`✅ Inline JSON parsed successfully:`, jsonData);
          
          if (jsonData.extractedData && requestedParameter && jsonData.extractedData[requestedParameter]) {
            const value = jsonData.extractedData[requestedParameter];
            logger.info(`✅ Parameter ${requestedParameter} extracted from inline JSON: ${value}`);
            return { [requestedParameter]: value };
          }
        } catch (jsonError) {
          logger.warn(`⚠️ Inline JSON parsing failed:`, jsonError);
        }
      }
      
      // PRIORITY 3: Pattern matching for direct responses
      const extractedData: any = {};
      const lowerResponse = geminiResponse.toLowerCase();
      
      if (!requestedParameter) {
        logger.warn('🚫 No requested parameter specified - skipping extraction');
        return {};
      }
      
      logger.info(`🎯 PATTERN MATCHING for ${requestedParameter}`);
      
      // Handle direct number responses (e.g., "3" for sleep hours)
      if (requestedParameter === 'sleepHours') {
        const numberMatch = geminiResponse.match(/(\d+)/);
        if (numberMatch) {
          const hours = parseInt(numberMatch[1]);
          if (hours >= 1 && hours <= 10) {
            extractedData.sleepHours = hours.toString();
            logger.info(`✅ Sleep hours extracted via number: ${hours}`);
            return extractedData;
          }
        }
      }
      
      // Handle direct word responses (e.g., "low" for stress level)
      if (requestedParameter === 'stressLevel') {
        if (lowerResponse.includes('low')) {
          extractedData.stressLevel = 'Low';
          logger.info(`✅ Stress level extracted: Low`);
          return extractedData;
        } else if (lowerResponse.includes('medium')) {
          extractedData.stressLevel = 'Medium';
          logger.info(`✅ Stress level extracted: Medium`);
          return extractedData;
        } else if (lowerResponse.includes('high')) {
          extractedData.stressLevel = 'High';
          logger.info(`✅ Stress level extracted: High`);
          return extractedData;
        }
      }
      
      // Handle direct word responses for other parameters
      if (requestedParameter === 'mood') {
        if (lowerResponse.includes('sad') || lowerResponse.includes('bad') || lowerResponse.includes('low')) {
          extractedData.mood = 'Sad';
          logger.info(`✅ Mood extracted: Sad`);
          return extractedData;
        } else if (lowerResponse.includes('happy') || lowerResponse.includes('good')) {
          extractedData.mood = 'Happy';
          logger.info(`✅ Mood extracted: Happy`);
          return extractedData;
        } else if (lowerResponse.includes('anxious') || lowerResponse.includes('worried')) {
          extractedData.mood = 'Anxious';
          logger.info(`✅ Mood extracted: Anxious`);
          return extractedData;
        } else if (lowerResponse.includes('neutral') || lowerResponse.includes('okay')) {
          extractedData.mood = 'Neutral';
          logger.info(`✅ Mood extracted: Neutral`);
          return extractedData;
        } else if (lowerResponse.includes('stressed')) {
          extractedData.mood = 'Stressed';
          logger.info(`✅ Mood extracted: Stressed`);
          return extractedData;
        }
      }
      
      // Handle loneliness with direct responses
      if (requestedParameter === 'loneliness') {
        if (lowerResponse.includes('often') || lowerResponse.includes('always')) {
          extractedData.loneliness = 'Often';
          logger.info(`✅ Loneliness extracted: Often`);
          return extractedData;
        } else if (lowerResponse.includes('sometimes')) {
          extractedData.loneliness = 'Sometimes';
          logger.info(`✅ Loneliness extracted: Sometimes`);
          return extractedData;
        } else if (lowerResponse.includes('never') || lowerResponse.includes('rarely')) {
          extractedData.loneliness = 'Never';
          logger.info(`✅ Loneliness extracted: Never`);
          return extractedData;
        }
      }
      
      // Handle academic pressure
      if (requestedParameter === 'academicPressure') {
        if (lowerResponse.includes('high') || lowerResponse.includes('overwhelming')) {
          extractedData.academicPressure = 'High';
          logger.info(`✅ Academic pressure extracted: High`);
          return extractedData;
        } else if (lowerResponse.includes('medium') || lowerResponse.includes('manageable')) {
          extractedData.academicPressure = 'Medium';
          logger.info(`✅ Academic pressure extracted: Medium`);
          return extractedData;
        } else if (lowerResponse.includes('low') || lowerResponse.includes('easy')) {
          extractedData.academicPressure = 'Low';
          logger.info(`✅ Academic pressure extracted: Low`);
          return extractedData;
        }
      }
      
      // Handle social support
      if (requestedParameter === 'socialSupport') {
        if (lowerResponse.includes('weak') || lowerResponse.includes('no one') || lowerResponse.includes('alone')) {
          extractedData.socialSupport = 'Weak';
          logger.info(`✅ Social support extracted: Weak`);
          return extractedData;
        } else if (lowerResponse.includes('average') || lowerResponse.includes('some')) {
          extractedData.socialSupport = 'Average';
          logger.info(`✅ Social support extracted: Average`);
          return extractedData;
        } else if (lowerResponse.includes('strong') || lowerResponse.includes('great')) {
          extractedData.socialSupport = 'Strong';
          logger.info(`✅ Social support extracted: Strong`);
          return extractedData;
        }
      }
      
      // Handle confidence level
      if (requestedParameter === 'confidenceLevel') {
        if (lowerResponse.includes('low') || lowerResponse.includes('not confident')) {
          extractedData.confidenceLevel = 'Low';
          logger.info(`✅ Confidence level extracted: Low`);
          return extractedData;
        } else if (lowerResponse.includes('medium') || lowerResponse.includes('somewhat')) {
          extractedData.confidenceLevel = 'Medium';
          logger.info(`✅ Confidence level extracted: Medium`);
          return extractedData;
        } else if (lowerResponse.includes('high') || lowerResponse.includes('very confident')) {
          extractedData.confidenceLevel = 'High';
          logger.info(`✅ Confidence level extracted: High`);
          return extractedData;
        }
      }
      
      // Handle hobbies
      if (requestedParameter === 'hobbiesInterest') {
        if (lowerResponse.includes('sports') || lowerResponse.includes('exercise')) {
          extractedData.hobbiesInterest = 'Sports';
          logger.info(`✅ Hobbies extracted: Sports`);
          return extractedData;
        } else if (lowerResponse.includes('music')) {
          extractedData.hobbiesInterest = 'Music';
          logger.info(`✅ Hobbies extracted: Music`);
          return extractedData;
        } else if (lowerResponse.includes('reading')) {
          extractedData.hobbiesInterest = 'Reading';
          logger.info(`✅ Hobbies extracted: Reading`);
          return extractedData;
        } else if (lowerResponse.includes('art')) {
          extractedData.hobbiesInterest = 'Art';
          logger.info(`✅ Hobbies extracted: Art`);
          return extractedData;
        } else if (lowerResponse.includes('none') || lowerResponse.includes('no hobbies')) {
          extractedData.hobbiesInterest = 'None';
          logger.info(`✅ Hobbies extracted: None`);
          return extractedData;
        }
      }
      
      // Handle journaling
      if (requestedParameter === 'opennessToJournaling') {
        if (lowerResponse.includes('yes') || lowerResponse.includes('open')) {
          extractedData.opennessToJournaling = 'Yes';
          logger.info(`✅ Journaling extracted: Yes`);
          return extractedData;
        } else if (lowerResponse.includes('no') || lowerResponse.includes('not')) {
          extractedData.opennessToJournaling = 'No';
          logger.info(`✅ Journaling extracted: No`);
          return extractedData;
        }
      }
      
      // Handle professional help
      if (requestedParameter === 'willingForProfessionalHelp') {
        if (lowerResponse.includes('yes') || lowerResponse.includes('open')) {
          extractedData.willingForProfessionalHelp = 'Yes';
          logger.info(`✅ Professional help extracted: Yes`);
          return extractedData;
        } else if (lowerResponse.includes('no') || lowerResponse.includes('not')) {
          extractedData.willingForProfessionalHelp = 'No';
          logger.info(`✅ Professional help extracted: No`);
          return extractedData;
        }
      }
      
      logger.warn(`⚠️ No pattern match found for ${requestedParameter} in response`);
      return extractedData;
      
      // All other parameter extractions are now handled by the intelligent pattern matching above
      // This prevents hardcoded overrides and ensures only the requested parameter is extracted
      
      logger.info('🔍 INTELLIGENT GEMINI RESPONSE PARSING:', { 
        extractedData, 
        responseLength: geminiResponse.length,
        hasData: Object.keys(extractedData).length > 0
      });
      
      return extractedData;
    } catch (error) {
      logger.error('Error parsing Gemini response:', error);
      return {};
    }
  }

  // Intelligent fallback that follows conversation flow and NEVER asks old questions
  private async getIntelligentFallback(message: string, conversationHistory: string[], wellnessData: any): Promise<string> {
    console.log('🔄 GENERATING INTELLIGENT FALLBACK RESPONSE');
    
    // Handle undefined/null parameters
    const safeWellnessData = wellnessData || {};
    
    // SECURITY: Don't log user messages to prevent data leakage
    console.log('📊 Current wellness data keys:', Object.keys(safeWellnessData));
    
    // Define the exact order of parameters to collect
    const parameterOrder = [
      'mood',
      'sleepHours', 
      'stressLevel',
      'academicPressure',
      'socialSupport',
      'loneliness',
      'confidenceLevel',
      'hobbiesInterest',
      'opennessToJournaling',
      'willingForProfessionalHelp'
    ];

    // Find the next parameter to ask about
    let nextParameter = null;
    logger.info('Intelligent fallback - checking wellness data:', { wellnessData: safeWellnessData });
    
    for (const param of parameterOrder) {
      if (!safeWellnessData[param]) {
        nextParameter = param;
        logger.info('Intelligent fallback - next parameter:', { nextParameter });
        break;
      }
    }

    // If all parameters are collected, give supportive response
    if (!nextParameter) {
      return "Thank you for sharing so much with me. Based on everything you've told me, I'd like to help you find some activities that might be beneficial. Let me think about what could work best for you.";
    }

      // ENHANCED: Use Gemini for fallback instead of hardcoded logic
      // This ensures Gemini always controls the conversation flow
      logger.info('🔄 Gemini fallback needed - calling Gemini API directly');
      
      try {
        // Call Gemini directly for fallback response
        const fallbackPrompt = `You are a supportive friend continuing a conversation. The user said: "${message}". 
        
Based on the conversation history and current wellness data: ${JSON.stringify(safeWellnessData)}

Please provide a natural, empathetic response that:
1. Acknowledges what they said
2. Extracts the wellness parameter if possible
3. Continues the conversation naturally
4. Returns response in this format: {code}{"extractedData": {"PARAMETER_NAME": "EXTRACTED_VALUE"}}{/code}

Be warm, understanding, and continue the conversation flow naturally.`;
        
        const GEMINI_API_KEY = config.gemini.apiKey;
        const GEMINI_ENDPOINT = config.gemini.endpoint;
        
        const fallbackResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fallbackPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          })
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || 
            "I understand what you're saying. Let me ask about the next important aspect of your wellness.";
          
          // Try to extract data from fallback response
          // const extractedData = this.parseGeminiResponse(fallbackText, nextParameter || undefined);
          
          return fallbackText.replace(/\{code\}[\s\S]*?\{\/code\}/g, '').trim();
        }
      } catch (fallbackError) {
        logger.error('Fallback Gemini call failed:', fallbackError);
      }
      
      // Ultimate fallback - simple acknowledgment
      return "I understand what you're saying. Let me ask about the next important aspect of your wellness.";
  }

  // REMOVED: makeIntelligentGuess function - letting Gemini handle everything naturally

  // REMOVED: getNextParameter and getParameterQuestion functions - letting Gemini handle everything naturally

  // Sanitize extracted data to ensure STRICT SEQUENTIAL parameter extraction
  private sanitizeExtractedData(extractedData: any, currentWellnessData: any): Partial<WellnessData> {
    const sanitizedData: Partial<WellnessData> = {};
    
          // STRICT RULE: Only extract the NEXT parameter in sequence, prevent forward guessing
      const parameterOrder = ['mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'];
      
      // Find the next parameter to collect
    let nextParameter: string | null = null;
    for (const param of parameterOrder) {
      if (!currentWellnessData[param]) {
        nextParameter = param;
        break;
      }
    }
    
      if (!nextParameter) {
        logger.info('✅ All parameters already collected - no extraction needed');
        return {};
      }
      
      logger.info(`🎯 STRICT SEQUENTIAL EXTRACTION: Only allowing ${nextParameter}`);
      
      // CRITICAL: Only extract the NEXT parameter, ignore all others
      for (const [param, value] of Object.entries(extractedData)) {
        if (param === nextParameter) {
          // This is the parameter we're supposed to collect
          const sanitizedValue = this.validateDatasetValue(param, value);
          if (sanitizedValue) {
            (sanitizedData as any)[param] = sanitizedValue;
            logger.info(`✅ Parameter ${param} sanitized: ${value} → ${sanitizedValue}`);
          }
        } else {
          // This is a forward parameter - IGNORE IT to prevent workflow breaking
          logger.warn(`🚫 BLOCKED forward parameter extraction: ${param} = ${value} (should only extract ${nextParameter})`);
        }
      }
      

      
      return sanitizedData;
  }



  // Validate and map values to exact dataset values using pure AI intelligence
  private validateDatasetValue(parameter: string, value: any): string | null {
    const datasetValues: { [key: string]: string[] } = {
      mood: ['Sad', 'Anxious', 'Happy', 'Neutral', 'Stressed'],
      sleepHours: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      stressLevel: ['Low', 'Medium', 'High'],
      academicPressure: ['Low', 'Medium', 'High'],
      socialSupport: ['Weak', 'Average', 'Strong'],
      loneliness: ['Sometimes', 'Often', 'Never'],
      confidenceLevel: ['Low', 'Medium', 'High'],
      hobbiesInterest: ['Sports', 'Music', 'Reading', 'Art', 'Travel', 'None'],
      opennessToJournaling: ['Yes', 'No'],
      willingForProfessionalHelp: ['Yes', 'No']
    };

    const validValues = datasetValues[parameter] || [];
    const inputValue = String(value).trim();
    
    // Exact match first - if Gemini already provided correct dataset value
    if (validValues.includes(inputValue)) {
      return inputValue;
    }
    
    // If not exact match, let Gemini's intelligence handle it
    // Don't force default values - let the AI mapping work naturally
    logger.info(`Value "${inputValue}" for ${parameter} not in exact dataset. Letting Gemini's intelligence handle the mapping.`);
    
    // Return the original value and let Gemini's natural intelligence map it
    return inputValue;
  }

  // REMOVED: extractDataFromUserMessage function - letting Gemini handle everything naturally

  // Get comprehensive mapping for parameter with all scenarios
  private getComprehensiveMappingForParameter(parameter: string): string {
    const comprehensiveMappings = {
      mood: `Valid Values: ["Sad", "Anxious", "Happy", "Neutral", "Stressed"]
HARDCODED SCENARIOS:
"not good" / "bad" / "low" / "down" / "depressed" / "blue" / "terrible" / "awful" → Sad
"worried" / "nervous" / "anxious" / "panicking" / "scared" / "fearful" → Anxious
"happy" / "good" / "great" / "wonderful" / "amazing" / "excited" / "joyful" → Happy
"okay" / "fine" / "alright" / "meh" / "neutral" / "normal" / "average" → Neutral
"stressed" / "overwhelmed" / "pressured" / "tense" / "frazzled" → Stressed
"could be better" / "not great" → Neutral
"mixed feelings" / "complicated" → Choose dominant emotion from context
"I don't know" / "maybe" / "not sure" → Neutral (default)`,
      
      sleepHours: `Valid Values: ["1","2","3","4","5","6","7","8","9","10"]
HARDCODED SCENARIOS:
"barely slept" / "almost none" / "pulled all-nighter" / "insomnia" → "1"
"very little" / "hardly any" / "almost nothing" → "2"
"few hours" / "little sleep" / "not much" → "3"
"insufficient" / "not enough" / "very less" → "5" (CRITICAL: not 7)
"adequate" / "normal amount" / "decent" / "okay" → "7"
"good sleep" / "slept well" / "restful" → "8"
"overslept" / "too much" / "a lot" → "9"
"all day" / "excessive" → "10"
Direct numbers: "5 hours" → "5", "around 6-7" → "6" (lower bound)
"I don't know" / "maybe" / "not sure" → "7" (default)`,
      
      stressLevel: `Valid Values: ["Low","Medium","High"]
HARDCODED SCENARIOS:
"very stressed" / "extremely stressed" / "overwhelmed" / "drowning" → High
"super stressed" / "totally stressed" / "can't handle it" → High
"somewhat stressed" / "moderately stressed" / "kind of stressed" → Medium
"a bit stressed" / "little stressed" / "manageable stress" → Medium
"not stressed" / "low stress" / "relaxed" / "calm" → Low
"normal stress" / "usual stress" → Medium
Scale mentions: "1-3/10" → Low, "4-6/10" → Medium, "7-10/10" → High
"I don't know" / "maybe" / "not sure" → Medium (default)`,
      
      academicPressure: `Valid Values: ["Low","Medium","High"]
HARDCODED SCENARIOS:
"exams killing me" / "drowning in assignments" / "too much work" → High
"parents expect too much" / "need perfect grades" / "pressure to succeed" → High
"behind in studies" / "failing" / "struggling academically" → High
"some pressure" / "manageable workload" / "keeping up okay" → Medium
"average student" / "normal academic stress" → Medium
"school's easy" / "no academic worries" / "on break" / "vacation" → Low
"not in school" / "graduated" → Low
"I don't know" / "maybe" / "not sure" → Medium (default)`,
      
      socialSupport: `Valid Values: ["Weak","Average","Strong"]
HARDCODED SCENARIOS:
"no one understands" / "all alone" / "no support" → Weak
"parents don't care" / "family doesn't understand" → Weak
"I feel disconnected with people" / "not very open to friends" → Weak (CRITICAL)
"don't feel connected" / "can't open up" → Weak
"few friends" / "some people" / "limited support" → Average
"friends are there sometimes" / "mixed support" → Average
"amazing friends" / "great family" / "strong support system" → Strong
"can always count on someone" / "people are there for me" → Strong
"I don't know" / "maybe" / "not sure" → Average (default)`,
      
      loneliness: `Valid Values: ["Sometimes","Often","Never"]
HARDCODED SCENARIOS:
"always lonely" / "constantly lonely" / "feel alone all the time" → Often
"never feel connected" / "always disconnected" → Often
"I feel disconnected" / "feel disconnected from people" → Often (CRITICAL)
"don't feel connected to anyone" / "can't connect" → Often
"sometimes lonely" / "occasionally lonely" / "now and then" → Sometimes
"weekends are lonely" / "certain times" → Sometimes
"never lonely" / "always surrounded" / "always have company" → Never
"alone but not lonely" / "prefer solitude" → Sometimes
"I don't know" / "maybe" / "not sure" → Sometimes (default)`,
      
      confidenceLevel: `Valid Values: ["Low","Medium","High"]
HARDCODED SCENARIOS:
"no confidence" / "hate myself" / "worthless" / "useless" → Low
"not confident" / "not very confident" / "low confidence" → Low
"imposter syndrome" / "fake it till I make it" → Medium
"depends on the day" / "varies" / "okay confidence" → Medium
"very confident" / "I believe in myself" / "I'm awesome" → High
"getting better" / "improving" → Medium
"used to be confident" → Low
"I don't know" / "maybe" / "not sure" → Medium (default)`,
      
      hobbiesInterest: `Valid Values: ["Sports","Music","Reading","Art","Travel","None"]
HARDCODED SCENARIOS:
"sports" / "exercise" / "gym" / "workout" / "dancing" → Sports
"music" / "singing" / "instruments" / "concerts" / "listening to music" → Music
"reading" / "books" / "novels" / "writing" / "poetry" → Reading
"art" / "drawing" / "painting" / "photography" / "creative" → Art
"travel" / "exploring" / "adventures" / "outdoors" / "new places" → Travel
"nothing" / "no hobbies" / "don't know" / "too tired" → None
"netflix" / "youtube" / "gaming" / "social media" → None (passive)
"I don't know" / "maybe" / "not sure" → None (default)`,
      
      opennessToJournaling: `Valid Values: ["Yes","No"]
HARDCODED SCENARIOS:
"yes" / "open to it" / "try it" / "sure" / "sounds good" → Yes
"already journal" / "love writing" / "used to journal" → Yes
"maybe" / "perhaps" / "worth trying" → Yes (lean positive)
"not my thing" / "can't write" / "don't like writing" → No
"too personal" / "scary" / "not comfortable" → No
"no time" / "too busy" → No
"I don't know" / "not sure" → Yes (default, encourage)`,
      
      willingForProfessionalHelp: `Valid Values: ["Yes","No"]
HARDCODED SCENARIOS:
"yes" / "consider it" / "open to it" / "if needed" → Yes
"already seeing someone" / "tried before" / "thinking about it" → Yes
"maybe" / "possibly" / "worth trying" → Yes (lean positive)
"no" / "not really" / "not comfortable" → No
"never" / "don't believe in therapy" / "parents won't allow" → No
"too expensive" / "stigma" / "what will people think" → No
"I don't know" / "not sure" → Yes (default, encourage)`
    };
    
    return comprehensiveMappings[parameter as keyof typeof comprehensiveMappings] || "Please extract the appropriate value based on context.";
  }
} 