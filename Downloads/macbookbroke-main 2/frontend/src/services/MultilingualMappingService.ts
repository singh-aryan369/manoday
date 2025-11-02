// Multilingual mapping service for ChatGPT responses across 5 languages
// This ensures user input in any language is mapped to English values for data storage

export interface MultilingualMapping {
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

export const multilingualMapping: MultilingualMapping = {
  mood: {
    // Hindi
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
    'हताश': 'depressed',
    // Tamil
    'மகிழ்ச்சி': 'happy',
    'சந்தோஷம்': 'happy',
    'சாதாரண': 'neutral',
    'சரி': 'neutral',
    'சோகம்': 'sad',
    'துக்கம்': 'sad',
    'கவலை': 'anxious',
    'பதட்டம்': 'anxious',
    'மனஅழுத்தம்': 'depressed',
    'மன அழுத்தம்': 'stressed',
    // Telugu
    'సంతోషం': 'happy',
    'సంతోషంగా': 'happy',
    'సామాన్యం': 'neutral',
    'బాగుంది': 'neutral',
    'దుఃఖం': 'sad',
    'బాధ': 'sad',
    'ఆందోళన': 'anxious',
    'భయం': 'anxious',
    'డిప్రెషన్': 'depressed',
    'ఒత్తిడి': 'stressed',
    // Kannada
    'ಸಂತೋಷ': 'happy',
    'ಸಂತೋಷವಾಗಿದೆ': 'happy',
    'ಸಾಮಾನ್ಯ': 'neutral',
    'ಚೆನ್ನಾಗಿದೆ': 'neutral',
    'ದುಃಖ': 'sad',
    'ದುಃಖವಾಗಿದೆ': 'sad',
    'ಆತಂಕ': 'anxious',
    'ಚಿಂತೆ': 'anxious',
    'ಖಿನ್ನತೆ': 'depressed',
    'ಒತ್ತಡ': 'stressed'
  },
  sleep: {
    // Numbers (all languages)
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
    // Hindi
    'एक': '1',
    'दो': '2',
    'तीन': '3',
    'चार': '4',
    'पांच': '5',
    'छह': '6',
    'सात': '7',
    'आठ': '8',
    'नौ': '9',
    'दस': '10',
    // Tamil
    'ஒன்று': '1',
    'இரண்டு': '2',
    'மூன்று': '3',
    'நான்கு': '4',
    'ஐந்து': '5',
    'ஆறு': '6',
    'ஏழு': '7',
    'எட்டு': '8',
    'ஒன்பது': '9',
    'பத்து': '10',
    // Telugu
    'ఒకటి': '1',
    'రెండు': '2',
    'మూడు': '3',
    'నాలుగు': '4',
    'ఐదు': '5',
    'ఆరు': '6',
    'ఏడు': '7',
    'ఎనిమిది': '8',
    'తొమ్మిది': '9',
    'పది': '10',
    // Kannada
    'ಒಂದು': '1',
    'ಎರಡು': '2',
    'ಮೂರು': '3',
    'ನಾಲ್ಕು': '4',
    'ಐದು': '5',
    'ಆರು': '6',
    'ಏಳು': '7',
    'ಎಂಟು': '8',
    'ಒಂಬತ್ತು': '9',
    'ಹತ್ತು': '10'
  },
  stress: {
    // Hindi
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम तनाव': 'low',
    'मध्यम तनाव': 'medium',
    'अधिक तनाव': 'high',
    'तनाव नहीं': 'low',
    'थोड़ा तनाव': 'low',
    'ज्यादा तनाव': 'high',
    // Tamil
    'குறைவு': 'low',
    'மத்திய': 'medium',
    'அதிகம்': 'high',
    'குறைவான மன அழுத்தம்': 'low',
    'நடுத்தர மன அழுத்தம்': 'medium',
    'அதிக மன அழுத்தம்': 'high',
    'மன அழுத்தம் இல்லை': 'low',
    // Telugu
    'తక్కువ': 'low',
    'మధ్యస్థ': 'medium',
    'ఎక్కువ': 'high',
    'తక్కువ ఒత్తిడి': 'low',
    'మధ్యస్థ ఒత్తిడి': 'medium',
    'అధిక ఒత్తిడి': 'high',
    'ఒత్తిడి లేదు': 'low',
    // Kannada
    'ಕಡಿಮೆ': 'low',
    'ಮಧ್ಯಮ': 'medium',
    'ಹೆಚ್ಚು': 'high',
    'ಕಡಿಮೆ ಒತ್ತಡ': 'low',
    'ಮಧ್ಯಮ ಒತ್ತಡ': 'medium',
    'ಹೆಚ್ಚು ಒತ್ತಡ': 'high',
    'ಒತ್ತಡ ಇಲ್ಲ': 'low'
  },
  academic: {
    // Hindi
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम दबाव': 'low',
    'मध्यम दबाव': 'medium',
    'अधिक दबाव': 'high',
    'कोई दबाव नहीं': 'low',
    'थोड़ा दबाव': 'low',
    'ज्यादा दबाव': 'high',
    // Tamil
    'குறைவு': 'low',
    'மத்திய': 'medium',
    'அதிகம்': 'high',
    'குறைவான அழுத்தம்': 'low',
    'நடுத்தர அழுத்தம்': 'medium',
    'அதிக அழுத்தம்': 'high',
    'அழுத்தம் இல்லை': 'low',
    // Telugu
    'తక్కువ': 'low',
    'మధ్యస్థ': 'medium',
    'ఎక్కువ': 'high',
    'తక్కువ ఒత్తిడి': 'low',
    'మధ్యస్థ ఒత్తిడి': 'medium',
    'అధిక ఒత్తిడి': 'high',
    'ఒత్తిడి లేదు': 'low',
    // Kannada
    'ಕಡಿಮೆ': 'low',
    'ಮಧ್ಯಮ': 'medium',
    'ಹೆಚ್ಚು': 'high',
    'ಕಡಿಮೆ ಒತ್ತಡ': 'low',
    'ಮಧ್ಯಮ ಒತ್ತಡ': 'medium',
    'ಹೆಚ್ಚು ಒತ್ತಡ': 'high',
    'ಒತ್ತಡ ಇಲ್ಲ': 'low'
  },
  social: {
    // Hindi
    'कमजोर': 'weak',
    'मध्यम': 'medium',
    'मजबूत': 'strong',
    'कमजोर सहायता': 'weak',
    'मध्यम सहायता': 'medium',
    'मजबूत सहायता': 'strong',
    'कोई सहायता नहीं': 'weak',
    'अच्छी सहायता': 'strong',
    // Tamil
    'பலவீனமான': 'weak',
    'சராசரி': 'medium',
    'வலுவான': 'strong',
    'பலவீனமான ஆதரவு': 'weak',
    'சராசரி ஆதரவு': 'medium',
    'வலுவான ஆதரவு': 'strong',
    'ஆதரவு இல்லை': 'weak',
    // Telugu
    'బలహీనమైన': 'weak',
    'సగటు': 'medium',
    'బలమైన': 'strong',
    'బలహీనమైన మద్దతు': 'weak',
    'సగటు మద్దతు': 'medium',
    'బలమైన మద్దతు': 'strong',
    'మద్దతు లేదు': 'weak',
    // Kannada
    'ದುರ್ಬಲ': 'weak',
    'ಸರಾಸರಿ': 'medium',
    'ಬಲವಾದ': 'strong',
    'ದುರ್ಬಲ ಬೆಂಬಲ': 'weak',
    'ಸರಾಸರಿ ಬೆಂಬಲ': 'medium',
    'ಬಲವಾದ ಬೆಂಬಲ': 'strong',
    'ಬೆಂಬಲ ಇಲ್ಲ': 'weak'
  },
  loneliness: {
    // Hindi
    'अक्सर': 'often',
    'कभी-कभी': 'sometimes',
    'शायद ही कभी': 'hardly',
    'हमेशा': 'often',
    'कभी नहीं': 'hardly',
    'कभी-कभार': 'sometimes',
    // Tamil
    'அடிக்கடி': 'often',
    'சில சமயங்களில்': 'sometimes',
    'அரிதாக': 'hardly',
    'எப்போதும்': 'often',
    'ஒருபோதும் இல்லை': 'hardly',
    // Telugu
    'తరచుగా': 'often',
    'కొన్నిసార్లు': 'sometimes',
    'అరుదుగా': 'hardly',
    'ఎల్లప్పుడూ': 'often',
    'ఎప్పుడూ కాదు': 'hardly',
    // Kannada
    'ಆಗಾಗ್ಗೆ': 'often',
    'ಕೆಲವೊಮ್ಮೆ': 'sometimes',
    'ಅಪರೂಪವಾಗಿ': 'hardly',
    'ಯಾವಾಗಲೂ': 'often',
    'ಎಂದಿಗೂ ಇಲ್ಲ': 'hardly'
  },
  confidence: {
    // Hindi
    'कम': 'low',
    'मध्यम': 'medium',
    'अधिक': 'high',
    'कम आत्मविश्वास': 'low',
    'मध्यम आत्मविश्वास': 'medium',
    'अधिक आत्मविश्वास': 'high',
    'कोई आत्मविश्वास नहीं': 'low',
    'अच्छा आत्मविश्वास': 'high',
    // Tamil
    'குறைவு': 'low',
    'மத்திய': 'medium',
    'அதிகம்': 'high',
    'குறைவான நம்பிக்கை': 'low',
    'நடுத்தர நம்பிக்கை': 'medium',
    'அதிக நம்பிக்கை': 'high',
    'நம்பிக்கை இல்லை': 'low',
    // Telugu
    'తక్కువ': 'low',
    'మధ్యస్థ': 'medium',
    'ఎక్కువ': 'high',
    'తక్కువ విశ్వాసం': 'low',
    'మధ్యస్థ విశ్వాసం': 'medium',
    'అధిక విశ్వాసం': 'high',
    'విశ్వాసం లేదు': 'low',
    // Kannada
    'ಕಡಿಮೆ': 'low',
    'ಮಧ್ಯಮ': 'medium',
    'ಹೆಚ್ಚು': 'high',
    'ಕಡಿಮೆ ಆತ್ಮವಿಶ್ವಾಸ': 'low',
    'ಮಧ್ಯಮ ಆತ್ಮವಿಶ್ವಾಸ': 'medium',
    'ಹೆಚ್ಚು ಆತ್ಮವಿಶ್ವಾಸ': 'high',
    'ಆತ್ಮವಿಶ್ವಾಸ ಇಲ್ಲ': 'low'
  },
  hobbies: {
    // Hindi
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
    'सैर': 'travelling',
    // Tamil
    'இசை': 'music',
    'பாடல்': 'music',
    'விளையாட்டு': 'sports',
    'விளையாட்டுகள்': 'sports',
    'வாசிப்பு': 'reading',
    'புத்தகங்கள்': 'reading',
    'பயணம்': 'travelling',
    'சுற்றுலா': 'travelling',
    'எதுவும் இல்லை': 'none',
    // Telugu
    'సంగీతం': 'music',
    'పాట': 'music',
    'క్రీడలు': 'sports',
    'ఆటలు': 'sports',
    'చదవడం': 'reading',
    'పుస్తకాలు': 'reading',
    'యాత్ర': 'travelling',
    'పర్యటన': 'travelling',
    'ఏమీ లేదు': 'none',
    // Kannada
    'ಸಂಗೀತ': 'music',
    'ಹಾಡು': 'music',
    'ಕ್ರೀಡೆಗಳು': 'sports',
    'ಆಟಗಳು': 'sports',
    'ಓದುವುದು': 'reading',
    'ಪುಸ್ತಕಗಳು': 'reading',
    'ಪ್ರಯಾಣ': 'travelling',
    'ಪ್ರವಾಸ': 'travelling',
    'ಯಾವುದೂ ಇಲ್ಲ': 'none'
  },
  journaling: {
    // Hindi
    'हाँ': 'yes',
    'नहीं': 'no',
    'हां': 'yes',
    'जी हाँ': 'yes',
    'बिल्कुल नहीं': 'no',
    'कभी-कभी': 'yes',
    // Tamil
    'ஆம்': 'yes',
    'இல்லை': 'no',
    'சரி': 'yes',
    'இல்லை இல்லை': 'no',
    // Telugu
    'అవును': 'yes',
    'కాదు': 'no',
    'సరే': 'yes',
    'ఖచ్చితంగా కాదు': 'no',
    // Kannada
    'ಹೌದು': 'yes',
    'ಇಲ್ಲ': 'no',
    'ಸರಿ': 'yes',
    'ಖಂಡಿತವಾಗಿ ಇಲ್ಲ': 'no'
  },
  professional: {
    // Hindi
    'हाँ': 'yes',
    'नहीं': 'no',
    'हां': 'yes',
    'जी हाँ': 'yes',
    'बिल्कुल नहीं': 'no',
    'शायद': 'yes',
    // Tamil
    'ஆம்': 'yes',
    'இல்லை': 'no',
    'சரி': 'yes',
    'இல்லை இல்லை': 'no',
    'ஒருவேளை': 'yes',
    // Telugu
    'అవును': 'yes',
    'కాదు': 'no',
    'సరే': 'yes',
    'ఖచ్చితంగా కాదు': 'no',
    'బహుశా': 'yes',
    // Kannada
    'ಹೌದು': 'yes',
    'ಇಲ್ಲ': 'no',
    'ಸರಿ': 'yes',
    'ಖಂಡಿತವಾಗಿ ಇಲ್ಲ': 'no',
    'ಬಹುಶಃ': 'yes'
  }
};

export class MultilingualMappingService {
  // Map any language input to English values for data storage
  static mapToEnglish(category: keyof MultilingualMapping, value: string): string {
    const mapping = multilingualMapping[category];
    if (!mapping) return value;
    
    // Try exact match first
    if (mapping[value]) {
      return mapping[value];
    }
    
    // Try case-insensitive match
    const lowerValue = value.toLowerCase();
    for (const [localValue, english] of Object.entries(mapping)) {
      if (localValue.toLowerCase() === lowerValue) {
        return english;
      }
    }
    
    // Try partial match
    for (const [localValue, english] of Object.entries(mapping)) {
      if (localValue.toLowerCase().includes(lowerValue) || lowerValue.includes(localValue.toLowerCase())) {
        return english;
      }
    }
    
    // Return original value if no mapping found
    return value;
  }
  
  // Map English values back to local language for display
  static mapFromEnglish(category: keyof MultilingualMapping, englishValue: string, targetLanguage: string = 'en'): string {
    const mapping = multilingualMapping[category];
    if (!mapping || targetLanguage === 'en') return englishValue;
    
    for (const [localValue, english] of Object.entries(mapping)) {
      if (english === englishValue) {
        return localValue;
      }
    }
    
    return englishValue;
  }
  
  // Get all possible local language values for a category
  static getLocalOptions(category: keyof MultilingualMapping): string[] {
    const mapping = multilingualMapping[category];
    return mapping ? Object.keys(mapping) : [];
  }
  
  // Get all possible English values for a category
  static getEnglishOptions(category: keyof MultilingualMapping): string[] {
    const mapping = multilingualMapping[category];
    return mapping ? [...new Set(Object.values(mapping))] : [];
  }
}

// ChatGPT prompt enhancement for multilingual support
export const getMultilingualChatGPTPrompt = (basePrompt: string, language: string): string => {
  const languageNames = {
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada'
  };

  const languageName = languageNames[language as keyof typeof languageNames] || 'English';

  if (language === 'en') {
    return basePrompt;
  }

  return `${basePrompt}

IMPORTANT: The user is communicating in ${languageName}. Please respond in ${languageName} but ensure that all data values are stored in English format as specified below:

DATA MAPPING REQUIREMENTS:
- Mood responses: Map ${languageName} mood words to English values (happy, sad, anxious, neutral, stressed, depressed)
- Sleep hours: Accept ${languageName} numbers but store as English numbers (1-10)
- Stress level: Map ${languageName} stress levels to English (low, medium, high)
- Academic pressure: Map ${languageName} pressure levels to English (low, medium, high)
- Social support: Map ${languageName} support levels to English (weak, medium, strong)
- Loneliness: Map ${languageName} loneliness levels to English (often, sometimes, hardly)
- Confidence: Map ${languageName} confidence levels to English (low, medium, high)
- Hobbies: Map ${languageName} hobby names to English (music, sports, reading, travelling)
- Journaling: Map ${languageName} yes/no to English (yes, no)
- Professional help: Map ${languageName} yes/no to English (yes, no)

RESPONSE FORMAT:
1. Respond to the user in ${languageName}
2. Extract and store all wellness data in English format
3. Use the mapping above to convert ${languageName} input to English values
4. Maintain the same data structure and validation as the English version

EXAMPLE (for Hindi):
User says: "मैं खुश हूं, 7 घंटे सोता हूं, तनाव कम है"
Response: "आपकी भावनाएं सुनकर अच्छा लगा! आप खुश हैं, 7 घंटे सोते हैं, और तनाव कम है।"
Data stored: { mood: "happy", sleep_hours: 7, stress_level: "low" }

Continue the conversation in ${languageName} while maintaining English data storage.`;
};
