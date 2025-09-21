// Hindi to English mapping service for ChatGPT responses
// This ensures Hindi user input is mapped to English values for data storage

export interface HindiEnglishMapping {
  mood: {
    [key: string]: string;
  };
  sleep: {
    [key: string]: string;
  };
  stress: {
    [key: string]: string;
  };
  academic: {
    [key: string]: string;
  };
  social: {
    [key: string]: string;
  };
  loneliness: {
    [key: string]: string;
  };
  confidence: {
    [key: string]: string;
  };
  hobbies: {
    [key: string]: string;
  };
  journaling: {
    [key: string]: string;
  };
  professional: {
    [key: string]: string;
  };
}

export const hindiEnglishMapping: HindiEnglishMapping = {
  mood: {
    'खुश': 'happy',
    'सामान्य': 'neutral',
    'उदास': 'sad',
    'चिंतित': 'anxious',
    'अवसादग्रस्त': 'depressed',
    'खुशी': 'happy',
    'सुखी': 'happy',
    'प्रसन्न': 'happy',
    'दुखी': 'sad',
    'परेशान': 'anxious',
    'तनावग्रस्त': 'anxious',
    'निराश': 'depressed',
    'हताश': 'depressed'
  },
  sleep: {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'एक': '1',
    'दो': '2',
    'तीन': '3',
    'चार': '4',
    'पांच': '5',
    'छह': '6',
    'सात': '7',
    'आठ': '8',
    'नौ': '9',
    'दस': '10'
  },
  stress: {
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम तनाव': 'low',
    'मध्यम तनाव': 'medium',
    'अधिक तनाव': 'high',
    'तनाव नहीं': 'low',
    'थोड़ा तनाव': 'low',
    'ज्यादा तनाव': 'high'
  },
  academic: {
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम दबाव': 'low',
    'मध्यम दबाव': 'medium',
    'अधिक दबाव': 'high',
    'कोई दबाव नहीं': 'low',
    'थोड़ा दबाव': 'low',
    'ज्यादा दबाव': 'high'
  },
  social: {
    'कमजोर': 'weak',
    'मध्यम': 'medium',
    'मजबूत': 'strong',
    'कमजोर सहायता': 'weak',
    'मध्यम सहायता': 'medium',
    'मजबूत सहायता': 'strong',
    'कोई सहायता नहीं': 'weak',
    'अच्छी सहायता': 'strong'
  },
  loneliness: {
    'अक्सर': 'often',
    'कभी-कभी': 'sometimes',
    'शायद ही कभी': 'hardly',
    'हमेशा': 'often',
    'कभी नहीं': 'hardly',
    'कभी-कभार': 'sometimes'
  },
  confidence: {
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम आत्मविश्वास': 'low',
    'मध्यम आत्मविश्वास': 'medium',
    'अधिक आत्मविश्वास': 'high',
    'कोई आत्मविश्वास नहीं': 'low',
    'अच्छा आत्मविश्वास': 'high'
  },
  hobbies: {
    'संगीत': 'music',
    'खेल': 'sports',
    'पढ़ना': 'reading',
    'यात्रा': 'travelling',
    'कोई नहीं': 'none',
    'गाना': 'music',
    'नृत्य': 'music',
    'फुटबॉल': 'sports',
    'क्रिकेट': 'sports',
    'बास्केटबॉल': 'sports',
    'किताबें': 'reading',
    'उपन्यास': 'reading',
    'घूमना': 'travelling',
    'सैर': 'travelling'
  },
  journaling: {
    'हाँ': 'yes',
    'नहीं': 'no',
    'हां': 'yes',
    'जी हाँ': 'yes',
    'बिल्कुल नहीं': 'no',
    'कभी-कभी': 'yes'
  },
  professional: {
    'हाँ': 'yes',
    'नहीं': 'no',
    'हां': 'yes',
    'जी हाँ': 'yes',
    'बिल्कुल नहीं': 'no',
    'शायद': 'yes'
  }
};

export class HindiEnglishMappingService {
  // Map Hindi input to English values for data storage
  static mapToEnglish(category: keyof HindiEnglishMapping, hindiValue: string): string {
    const mapping = hindiEnglishMapping[category];
    if (!mapping) return hindiValue;
    
    // Try exact match first
    if (mapping[hindiValue]) {
      return mapping[hindiValue];
    }
    
    // Try case-insensitive match
    const lowerValue = hindiValue.toLowerCase();
    for (const [hindi, english] of Object.entries(mapping)) {
      if (hindi.toLowerCase() === lowerValue) {
        return english;
      }
    }
    
    // Try partial match
    for (const [hindi, english] of Object.entries(mapping)) {
      if (hindi.toLowerCase().includes(lowerValue) || lowerValue.includes(hindi.toLowerCase())) {
        return english;
      }
    }
    
    // Return original value if no mapping found
    return hindiValue;
  }
  
  // Map English values back to Hindi for display
  static mapToHindi(category: keyof HindiEnglishMapping, englishValue: string): string {
    const mapping = hindiEnglishMapping[category];
    if (!mapping) return englishValue;
    
    for (const [hindi, english] of Object.entries(mapping)) {
      if (english === englishValue) {
        return hindi;
      }
    }
    
    return englishValue;
  }
  
  // Get all possible Hindi values for a category
  static getHindiOptions(category: keyof HindiEnglishMapping): string[] {
    const mapping = hindiEnglishMapping[category];
    return mapping ? Object.keys(mapping) : [];
  }
  
  // Get all possible English values for a category
  static getEnglishOptions(category: keyof HindiEnglishMapping): string[] {
    const mapping = hindiEnglishMapping[category];
    return mapping ? Object.values(mapping) : [];
  }
}

// ChatGPT prompt enhancement for Hindi support
export const getHindiChatGPTPrompt = (basePrompt: string): string => {
  return `${basePrompt}

IMPORTANT: The user is communicating in Hindi. Please respond in Hindi but ensure that all data values are stored in English format as specified below:

DATA MAPPING REQUIREMENTS:
- Mood responses: Map Hindi mood words to English values (खुश=happy, उदास=sad, चिंतित=anxious, etc.)
- Sleep hours: Accept Hindi numbers but store as English numbers (एक=1, दो=2, etc.)
- Stress level: Map Hindi stress levels to English (कम=low, मध्यम=medium, अधिक=high)
- Academic pressure: Map Hindi pressure levels to English (कम=low, मध्यम=medium, अधिक=high)
- Social support: Map Hindi support levels to English (कमजोर=weak, मध्यम=medium, मजबूत=strong)
- Loneliness: Map Hindi loneliness levels to English (अक्सर=often, कभी-कभी=sometimes, शायद ही कभी=hardly)
- Confidence: Map Hindi confidence levels to English (कम=low, मध्यम=medium, अधिक=high)
- Hobbies: Map Hindi hobby names to English (संगीत=music, खेल=sports, पढ़ना=reading, यात्रा=travelling)
- Journaling: Map Hindi yes/no to English (हाँ=yes, नहीं=no)
- Professional help: Map Hindi yes/no to English (हाँ=yes, नहीं=no)

RESPONSE FORMAT:
1. Respond to the user in Hindi
2. Extract and store all wellness data in English format
3. Use the mapping above to convert Hindi input to English values
4. Maintain the same data structure and validation as the English version

EXAMPLE:
User says: "मैं खुश हूं, 7 घंटे सोता हूं, तनाव कम है"
Response: "आपकी भावनाएं सुनकर अच्छा लगा! आप खुश हैं, 7 घंटे सोते हैं, और तनाव कम है।"
Data stored: { mood: "happy", sleep_hours: 7, stress_level: "low" }

Continue the conversation in Hindi while maintaining English data storage.`;
};
