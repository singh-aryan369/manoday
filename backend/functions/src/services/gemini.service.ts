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

  async generateResponse(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      // Check if this is a new chat session
      const isNewChat = this.checkNewChatSession(request.conversationHistory);
      if (isNewChat) {
        this.startNewChatSession();
        logger.info('🆕 New chat session detected - old insights will be displayed but not used for AI decisions');
      }

      // Reset asked parameters if this is a new conversation (first message)
      if (request.conversationHistory.length === 0) {
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
      
      const prompt = this.createEmpatheticPrompt(request.message, request.conversationHistory, request.wellnessData);
      
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

      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error:', { status: response.status, error: errorText });
        
        if (response.status === 429) {
          console.log('🚨 QUOTA EXCEEDED - USING FALLBACK RESPONSE 🚨');
          logger.warn('🚨 QUOTA EXCEEDED - USING FALLBACK RESPONSE 🚨');
          const fallbackResponse = await this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
          console.log('📝 FALLBACK RESPONSE:', fallbackResponse);
          logger.info('📝 FALLBACK RESPONSE:', { fallbackResponse });
          return {
            response: fallbackResponse,
            extractedData: {},
            updatedWellnessData: request.wellnessData,
            timestamp: new Date().toISOString()
          };
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           await this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
      
      // Calculate next parameter for strict sequential extraction
      const parameterOrder = ['mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'];
      let nextParameter: string | null = null;
      for (const param of parameterOrder) {
        if (!(request.wellnessData as any)[param]) {
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
        const fallbackResponse = await this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
        return {
          response: fallbackResponse,
          extractedData: {},
          updatedWellnessData: request.wellnessData,
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
      const sanitizedData = this.sanitizeExtractedData(extractedData, request.wellnessData);
      
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
        updatedWellnessData: { ...request.wellnessData, ...sanitizedData },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log('🚨 GEMINI API ERROR - USING FALLBACK RESPONSE 🚨');
      console.log('❌ Error details:', error);
      logger.error('🚨 GEMINI API ERROR - USING FALLBACK RESPONSE 🚨', error);
      const fallbackResponse = await this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
      console.log('📝 FALLBACK RESPONSE:', fallbackResponse);
      logger.info('📝 FALLBACK RESPONSE:', { fallbackResponse });
      return {
        response: fallbackResponse,
        extractedData: {},
        updatedWellnessData: request.wellnessData,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Create empathetic prompt for Gemini based on real interview examples
  private createEmpatheticPrompt(message: string, conversationHistory: string[], wellnessData: any): string {
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
      return `You are a supportive friend responding to someone asking for help.

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
    }

    // DON'T mark as asked yet - wait until we successfully extract data
    // this.askedParameters.add(nextParameter); // MOVED TO AFTER SUCCESSFUL EXTRACTION

    return `You are a warm, empathetic AI friend helping track mental wellness. 

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
- NEVER ask about a parameter that comes later in the sequence
- ALWAYS follow the exact order above

EXAMPLE: If user says "I feel lonely" and you're collecting loneliness (step 6), extract "Often" and ask about confidence level (step 7) next.

CONTEXT-AWARE INTELLIGENCE:
- Consider user's previous responses and overall conversation tone
- Use emotional context to make intelligent inferences
- If user seems generally positive → lean towards positive values
- If user seems generally negative → lean towards negative values
- If user seems neutral → use neutral values
- Always prioritize explicit mentions over context inference

CONFUSION SCENARIOS - ALWAYS EXTRACT AND MOVE FORWARD:
- "I don't know" → Make best guess from context and move to next parameter
- "Maybe" → Interpret as positive/neutral and move to next parameter  
- "Not sure" → Make intelligent inference and move to next parameter
- "Whatever" → Interpret as neutral and move to next parameter
- "Skip this" → Assign reasonable default and move to next parameter
- "I can't answer" → Use context clues and move to next parameter
- Vague responses → Always extract something, never get stuck
- "Not good" → Sad (not Happy)
- "Very less sleep" → 5 (not 7)

SKIP LOGIC - ALWAYS ASSIGN DEFAULT AND MOVE FORWARD:
- "skip" → Assign reasonable default value and move to next parameter
- "pass" → Assign reasonable default value and move to next parameter
- "next" → Assign reasonable default value and move to next parameter
- "move on" → Assign reasonable default value and move to next parameter

🚫 CRITICAL: NEVER extract future parameters. Only focus on the CURRENT parameter (${nextParameter}).

RESPONSE STRUCTURE:
1. Acknowledge user's message empathetically (3-4 lines)
2. ALWAYS confirm the extracted parameter value clearly using phrases like:
   - "Based on what you've shared, I can see that your mood is Sad"
   - "From what you've told me, it sounds like your sleep hours are around 5 hours"
   - "I understand that your stress level is High"
3. Ask about the next parameter naturally and warmly
4. Keep total response under 6-8 lines
5. Sound like a caring friend, not a questionnaire

CRITICAL: You MUST confirm the extracted value in your response so the system can parse it correctly.

🚨 CRITICAL JSON REQUIREMENT: 
You MUST return your response in this EXACT JSON format at the end:
{code}
{
  "extractedData": {
    "PARAMETER_NAME": "EXTRACTED_VALUE"
  }
}
{/code}

EXAMPLE RESPONSES:
User: "I'm feeling really down today"
You: "I'm so sorry you're feeling down. That can be really tough to go through, and I want you to know that it's okay to not be okay sometimes. Your feelings are valid, and I'm here to listen and support you. Based on what you've shared, I can see that your mood is Sad. Now, let me ask about your sleep - how many hours do you usually get at night? Sleep can really affect how we feel emotionally.

{code}
{
  "extractedData": {
    "mood": "Sad"
  }
}
{/code}"

User: "I barely slept last night"
You: "I can imagine how hard that must be. Not getting enough sleep can really take a toll on our mental health and make everything feel so much harder. It's like trying to run a marathon without any fuel - your body and mind just can't function properly. From what you've told me, it sounds like your sleep hours are around 2 hours. That's definitely not enough rest. Speaking of taking care of yourself, how would you describe your stress levels these days? Sleep and stress often go hand in hand.

{code}
{
  "extractedData": {
    "sleepHours": "2"
  }
}
{/code}"

CRITICAL: You are a compassionate friend who genuinely cares. Always extract data, never get stuck, and maintain the warm, supportive tone throughout the conversation. Your intelligence should handle almost every scenario - only use fallbacks when absolutely necessary.

🚫 STRICT EXTRACTION RULE: Only extract the CURRENT parameter. 
🚫 NEVER extract future parameters like loneliness, hobbies, journaling, or professional help unless they are explicitly mentioned by the user in relation to the current question.
🎯 Focus on ONE parameter at a time to maintain the conversation flow.`;
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
    console.log('📨 User message:', message);
    console.log('📊 Current wellness data:', wellnessData);
    
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
    logger.info('Intelligent fallback - checking wellness data:', { wellnessData });
    
    for (const param of parameterOrder) {
      if (!wellnessData[param]) {
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
        
Based on the conversation history and current wellness data: ${JSON.stringify(wellnessData)}

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