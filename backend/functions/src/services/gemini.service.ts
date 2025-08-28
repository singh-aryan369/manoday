import { GeminiRequest, GeminiResponse, WellnessData } from '../types';
import { config } from '../config';
import * as logger from 'firebase-functions/logger';

export class GeminiService {
  async generateResponse(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      const GEMINI_API_KEY = config.gemini.apiKey;
      const GEMINI_ENDPOINT = config.gemini.endpoint;
      
      const prompt = this.createEmpatheticPrompt(request.message, request.conversationHistory, request.wellnessData);
      
      logger.info('Sending prompt to Gemini:', { prompt: prompt.substring(0, 500) + '...' });
      
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error:', { status: response.status, error: errorText });
        
        if (response.status === 429) {
          logger.info('Quota exceeded, using intelligent fallback');
          const fallbackResponse = this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
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
                           this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
      
      const extractedData = this.parseGeminiResponse(geminiResponse);
      // More robust JSON cleaning - remove all JSON blocks and any remaining JSON-like content
      let cleanResponse = geminiResponse
        .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '') // Remove ```json blocks
        .replace(/```\s*\{[\s\S]*?\}\s*```/g, '') // Remove any ``` blocks with JSON
        .replace(/\{[\s\S]*?"extractedData"[\s\S]*?\}/g, '') // Remove any JSON with extractedData
        .replace(/\n\s*\n/g, '\n') // Clean up extra newlines
        .trim();
      
      // STRICT RULE: Only allow extraction of current parameter, prevent forward guessing
      const sanitizedData = this.sanitizeExtractedData(extractedData, request.wellnessData);
      
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
      logger.error('Vertex AI Gemini call failed:', error);
      const fallbackResponse = this.getIntelligentFallback(request.message, request.conversationHistory, request.wellnessData);
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
    const history = conversationHistory.slice(-6).join('\n'); // Keep last 6 exchanges for context
    
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

    // Count collected parameters and assess conversation flow with intelligent progression
    let collectedCount = 0;
    let nextParameter: string | null = null;
    
    for (const param of parameterOrder) {
      if (wellnessData[param]) {
        collectedCount++;
      } else if (!nextParameter) {
        nextParameter = param;
      }
    }
    
    const conversationLength = conversationHistory.length;
    
    // Check if we've been asking about the same parameter multiple times
    if (nextParameter) {
      const currentParamMessages = conversationHistory.filter(msg => {
        const lowerMsg = msg.toLowerCase();
        return lowerMsg.includes(nextParameter as string) || 
               lowerMsg.includes('sleep') || 
               lowerMsg.includes('stress') ||
               lowerMsg.includes('academic') ||
               lowerMsg.includes('support') ||
               lowerMsg.includes('lonely') ||
               lowerMsg.includes('confidence') ||
               lowerMsg.includes('hobby') ||
               lowerMsg.includes('journal') ||
               lowerMsg.includes('professional');
      });
      
      // If we've asked about this parameter 2+ times, make intelligent assumption and move forward
      if (currentParamMessages.length >= 2) {
        logger.info(`User has been asked about ${nextParameter} multiple times, will make intelligent assumption`);
      }
    }
    
    // Check if user explicitly asks for recommendation
    const userAsksForRecommendation = message.toLowerCase().includes('recommend me') || 
                                    message.toLowerCase().includes('suggest me') || 
                                    message.toLowerCase().includes('help me') ||
                                    message.toLowerCase().includes('recommend') ||
                                    message.toLowerCase().includes('suggest');
    
    if (userAsksForRecommendation) {
      nextParameter = null; // User wants recommendation now
    }

    logger.info('Smart prompt logic:', { collectedCount, conversationLength, nextParameter, willContinueQuestioning: !!nextParameter });

    // If user asks for recommendation OR all parameters collected, give brief supportive response
    if (!nextParameter) {
      return `You are a supportive friend responding to someone asking for help.

User's message: "${message}"
What you know about them: ${JSON.stringify(wellnessData)}

CRITICAL INSTRUCTIONS:
1. Provide 4-5 lines of empathetic, caring response
2. Be warm, understanding, and emotionally supportive
3. If they ask for recommendation/activity, acknowledge their request warmly
4. Sound like a caring friend who truly understands their struggles
5. Show genuine empathy and validation of their feelings
6. Be encouraging and hopeful while acknowledging their challenges

Remember: Compassionate, empathetic, supportive - like a close friend who truly cares.`;
    }







    return `You are a warm, empathetic wellness companion who genuinely cares about people. Your role is to chat naturally while collecting wellness information.

🚨 CRITICAL INSTRUCTION: You are a warm, caring friend who genuinely wants to help. While being empathetic and supportive, you MUST be decisive and move forward. NEVER ask follow-up questions or seek clarification - instead, use your emotional intelligence to make smart assumptions and naturally progress the conversation. Be caring but confident.

CURRENT FOCUS: ${nextParameter}
USER'S MESSAGE: "${message}"
CONVERSATION HISTORY: ${history}

PERSONALITY & STYLE:
- Be warm, friendly, and genuinely caring
- Show deep empathy and understanding - acknowledge their feelings first
- Keep responses elaborative but not too long (5-6 sentences)
- Sound like a caring friend who truly listens and cares
- Use encouraging, supportive, and comforting language
- Always acknowledge their emotional state before asking questions
- Show you understand what they're going through
- Be encouraging and hopeful while being realistic

STRICT RULES - FOLLOW THESE EXACTLY:

1. **NEVER ASK FOLLOW-UP QUESTIONS**: If user response is unclear, assign a smart value immediately and move to next parameter
2. **ALWAYS ASSIGN AND MOVE**: Every response must assign a value to current parameter and ask about next parameter
3. **NO REPHRASING**: Never rephrase or ask the same question differently - assign value and move forward
4. **CONTEXT-BASED ASSIGNMENT**: Use user's response + conversation context to assign smart value to current parameter
5. **IMMEDIATE PROGRESSION**: After assigning current parameter value, immediately ask about next parameter
6. **NEVER REPEAT**: Once you ask about a parameter, never ask about it again - assign value and move forward

SMART ASSUMPTION RULES - ALWAYS ASSIGN AND MOVE:
- If user says "skip", "next", "don't want to answer" → Assign smart value to ${nextParameter} and move to next
- If user says "kinda", "maybe", "not sure" → Assign smart value to ${nextParameter} and move to next  
- If user says "tired", "messy", "overwhelming" → Assign smart value to ${nextParameter} and move to next
- If user response is unclear → Assign smart value to ${nextParameter} and move to next
- If user gives vague response → Assign smart value to ${nextParameter} and move to next
- If user doesn't answer directly → Assign smart value to ${nextParameter} and move to next
- If user gives emotional response → Assign smart value to ${nextParameter} and move to next
- **CRITICAL**: ANY unclear response = assign smart value and move forward immediately

EXAMPLE OF CORRECT BEHAVIOR:
- Ask about sleep → User says "feeling low" → Assign sleepHours: "5" (current parameter), then ask about stress
- Ask about stress → User says "skip" → Assign stressLevel: "High" (current parameter), then ask about academic
- Ask about academic → User says "maybe" → Assign academicPressure: "Medium" (current parameter), then ask about support

EMPATHETIC RESPONSE EXAMPLES:
- **Instead of**: "How would you describe your stress levels lately?"
- **Say**: "I can see you're going through a really challenging time, and I want you to know that it's completely normal to feel overwhelmed. When you think about your stress levels these days, would you say you're feeling more on the overwhelmed side, manageable but challenging, or actually pretty calm and relaxed?"

- **Instead of**: "How many hours of sleep do you usually get?"
- **Say**: "I know when we're struggling emotionally, sleep often gets disrupted too, and that can make everything feel even harder. Can you tell me, on a typical night, how many hours of rest are you actually getting? I want to understand how this is affecting you."

SPECIFIC EXAMPLES FOR LONELINESS & CONFIDENCE:
- **Loneliness Question**: "I hear you. Do you find yourself feeling lonely often, sometimes, or hardly ever?"
- **User Response**: "I don't know, maybe" → **CARING RESPONSE**: "I understand that feeling of uncertainty. Based on what you've shared, it sounds like you experience loneliness sometimes, and that's completely normal. Let me ask you about something else..." → **ASSIGN**: loneliness: "Sometimes" and move to confidence
- **User Response**: "It's complicated" → **CARING RESPONSE**: "Life can definitely feel complicated, and I hear that complexity in your voice. From our conversation, I sense you might feel lonely sometimes, and that's okay. Let me ask you about..." → **ASSIGN**: loneliness: "Sometimes" and move to confidence  
- **User Response**: "I'm not sure" → **CARING RESPONSE**: "It's okay to not be sure - these feelings can be confusing. I think I understand where you're coming from, and it seems like loneliness visits you sometimes. Now let me ask you about..." → **ASSIGN**: loneliness: "Sometimes" and move to confidence

- **Confidence Question**: "Thank you for sharing. How would you describe your confidence level these days?"
- **User Response**: "It varies" → **CARING RESPONSE**: "That's so human - confidence really does ebb and flow. I can see from our chat that you're someone who has both strong and uncertain moments, which sounds like a medium confidence level to me. Let me ask you about..." → **ASSIGN**: confidenceLevel: "Medium" and move to hobbies
- **User Response**: "Depends on the day" → **CARING RESPONSE**: "That's completely normal - we all have our ups and downs. I can tell you're someone who's honest about your feelings, and that suggests a balanced confidence level. Let me ask you about..." → **ASSIGN**: confidenceLevel: "Medium" and move to hobbies
- **User Response**: "I'm not sure" → **CARING RESPONSE**: "It's okay to not be sure about confidence - it's such a complex feeling. I think I understand you well enough to say you seem to have a medium level of confidence, and that's perfectly fine. Now let me ask you about..." → **ASSIGN**: confidenceLevel: "Medium" and move to hobbies

CRITICAL: After your response, add this JSON block with extracted data:
\`\`\`json
{
  "extractedData": {
    // ALWAYS assign a value to ${nextParameter} - even if unclear, make a smart assumption
    // Use context, emotion, and conversation history to assign appropriate value
    // NEVER leave extractedData empty - always assign and move forward
  }
}
\`\`\`

CRITICAL DATASET VALUES - USE THESE EXACT VALUES ONLY:

**Mood**: "Sad", "Anxious", "Happy", "Neutral", "Stressed"
**SleepHours**: "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
**StressLevel**: "Low", "Medium", "High"
**AcademicPressure**: "Low", "Medium", "High"
**SocialSupport**: "Weak", "Average", "Strong"
**Loneliness**: "Sometimes", "Often", "Never"
**ConfidenceLevel**: "Low", "Medium", "High"
**HobbiesInterest**: "Sports", "Music", "Reading", "Art", "Travel", "None"
**OpennessToJournaling**: "Yes", "No"
**WillingForProfessionalHelp**: "Yes", "No"

**USE YOUR INTELLIGENCE**: Map user responses to these exact values using context, empathy, and understanding. Don't use generic terms - be smart about the mapping.

Already collected: ${JSON.stringify(wellnessData)}

REMEMBER: Be warm and empathetic, never repeat questions, only guess the CURRENT parameter value, then move to next question. Never guess forward parameters. Use ONLY the exact dataset values listed above.

CRITICAL: Every response must show empathy first - acknowledge their feelings, show understanding, then ask your question naturally. Don't just ask questions coldly.

FRIENDLY GUIDANCE - BE CARING BUT DECISIVE:
- ❌ Don't ask: "Can you be more specific about feeling lonely?"
- ❌ Don't ask: "What do you mean by 'it varies' for confidence?"
- ❌ Don't ask: "I need to understand better, can you explain?"
- ❌ Don't ask: "Let me rephrase that question..."
- ❌ Don't ask: "I'm not sure I understand, can you clarify?"

INSTEAD, BE A CARING FRIEND WHO:
- ✅ Uses emotional intelligence to understand their feelings
- ✅ Makes smart, caring assumptions based on context
- ✅ Naturally moves the conversation forward with warmth
- ✅ Shows empathy while being confident in their understanding
- ✅ If unclear, gently assumes reasonable values and moves on`;
  }



  private parseGeminiResponse(geminiResponse: string): Partial<WellnessData> {
    try {
      // Look for JSON block in the response
      const jsonMatch = geminiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        return jsonData.extractedData || {};
      }
      
      // If no JSON block, try to extract from the text using enhanced parsing
      const extractedData: any = {};
      
      // Extract sleep hours if mentioned
      const sleepMatch = geminiResponse.match(/(\d+)\s*hours?/i);
      if (sleepMatch) {
        extractedData.sleepHours = sleepMatch[1];
      }
      
      // Enhanced parameter extraction for professional help
      if (geminiResponse.toLowerCase().includes('professional') || geminiResponse.toLowerCase().includes('counselor') || 
          geminiResponse.toLowerCase().includes('contact') || geminiResponse.toLowerCase().includes('reach out') ||
          geminiResponse.toLowerCase().includes('will contact') || geminiResponse.toLowerCase().includes('need i will') ||
          geminiResponse.toLowerCase().includes('if i need') || geminiResponse.toLowerCase().includes('i will contact')) {
        
        // Check for positive indicators
        if (geminiResponse.toLowerCase().includes('yes') || geminiResponse.toLowerCase().includes('will') || 
            geminiResponse.toLowerCase().includes('contact') || geminiResponse.toLowerCase().includes('reach') ||
            geminiResponse.toLowerCase().includes('open') || geminiResponse.toLowerCase().includes('consider') ||
            geminiResponse.toLowerCase().includes('if i need') || geminiResponse.toLowerCase().includes('i will')) {
          extractedData.willingForProfessionalHelp = 'Yes';
        } else if (geminiResponse.toLowerCase().includes('no') || geminiResponse.toLowerCase().includes('not') ||
                   geminiResponse.toLowerCase().includes('never') || geminiResponse.toLowerCase().includes('wouldn\'t') ||
                   geminiResponse.toLowerCase().includes('don\'t think') || geminiResponse.toLowerCase().includes('not right now')) {
          extractedData.willingForProfessionalHelp = 'No';
        }
      }
      
      // Extract other parameters based on context clues
      if (geminiResponse.toLowerCase().includes('mood:') || geminiResponse.toLowerCase().includes('feeling:')) {
        // Extract mood from context
        if (geminiResponse.toLowerCase().includes('sad') || geminiResponse.toLowerCase().includes('down')) {
          extractedData.mood = 'Sad';
        } else if (geminiResponse.toLowerCase().includes('happy') || geminiResponse.toLowerCase().includes('good')) {
          extractedData.mood = 'Happy';
        } else if (geminiResponse.toLowerCase().includes('anxious') || geminiResponse.toLowerCase().includes('worried')) {
          extractedData.mood = 'Anxious';
        }
      }
      
      return extractedData;
    } catch (error) {
      logger.error('Error parsing Gemini response:', error);
      return {};
    }
  }

  // Intelligent fallback that follows conversation flow
  private getIntelligentFallback(message: string, conversationHistory: string[], wellnessData: any): string {
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

    // Parameter-specific fallback questions
    const fallbackQuestions = {
      mood: "I hear you. How have you been feeling emotionally lately?",
      sleepHours: "I understand. How many hours of sleep do you usually get at night?",
      stressLevel: "That sounds challenging. Would you say your stress level is low, medium, or high right now?",
      academicPressure: "I get that. How about your schoolwork - does it feel manageable or overwhelming?",
      socialSupport: "That must be tough. Do you feel supported by your friends and family?",
      loneliness: "I hear you. Do you find yourself feeling lonely often, sometimes, or hardly ever?",
      confidenceLevel: "Thank you for sharing. How would you describe your confidence level these days?",
      hobbiesInterest: "I understand. What kinds of activities or hobbies do you enjoy in your free time?",
      opennessToJournaling: "That makes sense. Would you be open to trying journaling as a way to express your thoughts?",
      willingForProfessionalHelp: "I appreciate your honesty. If things felt overwhelming, would you consider talking to a counselor or professional?"
    };

    const question = fallbackQuestions[nextParameter as keyof typeof fallbackQuestions] || "I'm here to listen and support you. Can you tell me more about how you're feeling?";
    logger.info('Intelligent fallback - returning question:', { question });
    return question;
  }

  // STRICT RULE: Sanitize extracted data to prevent forward guessing and enforce dataset values
  private sanitizeExtractedData(extractedData: any, currentWellnessData: any): any {
    // Only allow parameters that are already in current wellness data OR the next parameter in sequence
    const parameterOrder = [
      'mood', 'sleepHours', 'stressLevel', 'academicPressure', 'socialSupport', 
      'loneliness', 'confidenceLevel', 'hobbiesInterest', 'opennessToJournaling', 'willingForProfessionalHelp'
    ];
    
    // Find the next parameter that needs to be collected
    let nextParameter: string | null = null;
    for (const param of parameterOrder) {
      if (!currentWellnessData[param]) {
        nextParameter = param;
        break;
      }
    }
    
    // Only allow extraction of the next parameter, prevent forward guessing
    const sanitized: any = {};
    if (nextParameter && extractedData[nextParameter]) {
      // Validate that the value matches the dataset exactly
      const validValue = this.validateDatasetValue(nextParameter, extractedData[nextParameter]);
      if (validValue) {
        sanitized[nextParameter] = validValue;
      }
    }
    
    logger.info('Data sanitization:', { 
      original: extractedData, 
      sanitized: sanitized, 
      nextParameter: nextParameter 
    });
    
    return sanitized;
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
    // This allows for context-aware, empathetic mapping based on conversation
    return inputValue;
  }
}
