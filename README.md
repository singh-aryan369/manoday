# 🧠 MANODAY - Mental Wellness AI Chatbot

> An intelligent, empathetic mental wellness chatbot powered by Google's Vertex AI Gemini and AutoML, designed to provide personalized mental health support and activity recommendations.

## ✨ **Features**

- 🤖 **AI-Powered Conversations**: Natural language understanding with Gemini 2.5 Flash
- 🧘 **Wellness Assessment**: Systematic collection of 10 wellness parameters
- 🎯 **Personalized Recommendations**: AutoML-powered activity suggestions based on wellness profile
- 💬 **Empathetic Responses**: Therapist-like conversation style with context awareness
- 🔄 **Smart Parameter Extraction**: Intelligent fallbacks and context-based defaults
- 🚀 **Real-time Processing**: Instant responses and recommendations
- 🔒 **Secure Architecture**: Environment-based credential management

## 🏗️ **Architecture**

```
Frontend (React) ←→ Backend (Firebase Functions) ←→ Vertex AI (Gemini + AutoML)
```

### **Tech Stack**
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Firebase Cloud Functions + Node.js
- **AI Services**: Google Vertex AI Gemini + AutoML
- **Authentication**: Firebase Auth
- **Database**: Firestore (planned)

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Firebase CLI
- Google Cloud Project with Vertex AI enabled

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/manoday-app.git
cd manoday-app
```

### **2. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend/functions
npm install

# Install frontend dependencies
cd ../../frontend
npm install
```

### **3. Set Up Credentials** ⚠️ **CRITICAL STEP!**

**You MUST add real credentials to make the app work!**

#### **Option A: Environment Files (Recommended)**
```bash
# Backend
cd backend/functions
cp env.example .env
# Edit .env with real values from CREDENTIALS.md

# Frontend
cd ../../frontend
cp env.example .env
# Edit .env with your Firebase config
```

#### **Option B: Direct Configuration**
Edit `backend/functions/src/config.ts` and replace placeholder values:
```typescript
gemini: {
  apiKey: 'YOUR_REAL_GEMINI_API_KEY', // Replace this!
  endpoint: 'YOUR_REAL_GEMINI_ENDPOINT', // Replace this!
  // ... rest of config
}
```

### **4. Start the Backend**
```bash
cd backend/functions
npm run serve
```
✅ Backend will be running at `http://localhost:5001`

### **5. Start the Frontend**
```bash
cd ../../frontend
npm start
```
✅ Frontend will be running at `http://localhost:3000`

### **6. Test the Integration**
- Open `http://localhost:3000` in your browser
- Send a message to the chatbot
- Verify Gemini API calls work
- Verify AutoML recommendations are generated

## 🔐 **Credential Setup**

### **Required Credentials**
You need these credentials to make the app functional:

1. **Vertex AI Gemini API Key**
2. **Vertex AI AutoML Endpoint**
3. **Google Cloud Service Account**
4. **Firebase Project Configuration**

### **Where to Get Credentials**
- **Google Cloud Console**: Enable Vertex AI APIs
- **Firebase Console**: Create project and get config
- **Service Account**: Create and download private key

### **Security Notes**
- ✅ **SAFE**: `.env` files are excluded from Git
- ✅ **SAFE**: `config.local.ts` is excluded from Git
- ❌ **NOT SAFE**: Hardcoded credentials in source code
- 🔒 **SECURE**: Use environment variables in production

## 🧠 **Wellness Parameters**

The chatbot systematically collects these 10 wellness parameters:

1. **Mood** - Current emotional state
2. **Sleep Hours** - Hours of sleep per night
3. **Stress Level** - Current stress assessment
4. **Academic Pressure** - Academic workload stress
5. **Social Support** - Quality of social connections
6. **Loneliness** - Feelings of isolation
7. **Confidence Level** - Self-confidence assessment
8. **Hobbies Interest** - Engagement in activities
9. **Openness to Journaling** - Willingness to write
10. **Professional Help Willingness** - Openness to therapy

## 🤖 **AI Integration**

### **Gemini 2.5 Flash**
- **Purpose**: Natural language understanding and empathetic responses
- **Features**: Context-aware conversations, parameter extraction
- **Model**: `gemini-2.5-flash`
- **Temperature**: 0.7 (balanced creativity)

### **AutoML Model**
- **Purpose**: Personalized activity recommendations
- **Model ID**: `976725316011556864`
- **Training**: Custom wellness dataset
- **Output**: Tailored activity suggestions

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Backend (.env)
GEMINI_API_KEY=your_gemini_api_key
AUTOML_ENDPOINT=your_automl_endpoint
SERVICE_ACCOUNT_EMAIL=your_service_account_email
SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key

# Frontend (.env)
REACT_APP_BACKEND_URL=http://localhost:5001
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
```

### **Firebase Functions Config**
```bash
firebase functions:config:set gemini.api_key="your_key"
firebase functions:config:set automl.endpoint="your_endpoint"
firebase functions:config:set service_account.email="your_email"
firebase functions:config:set service_account.private_key="your_key"
```

## 🚀 **Deployment**

### **Firebase Functions**
```bash
cd backend/functions
firebase deploy --only functions
```

### **Frontend (Firebase Hosting)**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## 🧪 **Testing**

### **Backend Testing**
```bash
cd backend/functions
npm test
```

### **API Testing**
```bash
# Test Gemini endpoint
curl -X POST http://localhost:5001/smart-surf-469908-n0/us-central1/gemini \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you feeling today?"}'

# Test AutoML endpoint
curl -X POST http://localhost:5001/smart-surf-469908-n0/us-central1/automl \
  -H "Content-Type: application/json" \
  -d '{"wellnessData": {"mood": "sad", "sleepHours": 6}}'
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **"Cannot find module" errors**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### **Port conflicts**
```bash
# Kill existing processes
pkill -f firebase
pkill -f "npm run serve"
```

#### **Environment variables not loading**
- Ensure `.env` files exist in correct locations
- Check file permissions
- Restart development servers

#### **API quota exceeded**
- Check Google Cloud Console for quota limits
- Implement rate limiting
- Use fallback responses

### **Debug Mode**
Enable debug logging in `backend/functions/src/index.ts`:
```typescript
console.log('🔍 Debug: Environment variables loaded');
console.log('🔍 Debug: Config validation passed');
```

## 📁 **Project Structure**

```
manoday-app/
├── backend/
│   ├── functions/
│   │   ├── src/
│   │   │   ├── index.ts          # Main functions
│   │   │   ├── config.ts         # Configuration
│   │   │   └── config.local.ts   # Local credentials (gitignored)
│   │   ├── package.json
│   │   └── .env                  # Environment variables (gitignored)
│   └── firestore.rules
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chatbot.tsx       # Main chatbot component
│   │   │   ├── LoginPage.tsx     # Authentication
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # Authentication context
│   │   └── App.tsx               # Main app component
│   ├── .env                      # Frontend environment (gitignored)
│   └── package.json
├── .gitignore                    # Git exclusions
├── CREDENTIALS.md               # Real credentials (gitignored)
├── README.md                    # This file
└── firebase.json                # Firebase configuration
```

## 🤝 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Code Standards**
- Use TypeScript for type safety
- Follow ESLint rules
- Write meaningful commit messages
- Test your changes locally

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### **Getting Help**
- Check the troubleshooting section above
- Review Firebase and Google Cloud documentation
- Open an issue on GitHub

### **Useful Resources**
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai)
- [React Documentation](https://reactjs.org/docs/)

## 🎯 **Roadmap**

### **Phase 1** ✅ **Complete**
- Basic chatbot functionality
- Gemini integration
- AutoML recommendations
- Wellness parameter collection

### **Phase 2** 🚧 **In Progress**
- User authentication
- Conversation history
- Progress tracking
- Mobile responsiveness

### **Phase 3** 📋 **Planned**
- Multi-language support
- Advanced analytics
- Professional integration
- Mobile app

---

## 🎉 **Getting Started Checklist**

- [ ] Clone the repository
- [ ] Install dependencies
- [ ] Set up credentials (CRITICAL!)
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Test chatbot functionality
- [ ] Verify Gemini API calls
- [ ] Verify AutoML recommendations

**Happy coding! 🚀🧠✨**
