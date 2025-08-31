# 🧠 Manoday - AI-Powered Mental Wellness App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10+-orange.svg)](https://firebase.google.com/)

## 🌟 Overview

**Manoday** is an intelligent mental wellness application that combines cutting-edge AI technology with empathetic user experience to provide personalized mental health support.

### ✨ Key Features

- 🤖 **Google Gemini AI Integration** - Intelligent, empathetic conversations
- 🎯 **Google Cloud AutoML** - Personalized activity recommendations
- 🔐 **End-to-End Encryption** - User data privacy with AES-256-GCM
- 📱 **Modern React Frontend** - Beautiful, responsive UI with Tailwind CSS
- 🔥 **Firebase Backend** - Scalable cloud functions and database
- 🧠 **Wellness Parameter Tracking** - 10 comprehensive mental health metrics
- 📊 **Session Management** - Chat history and progress tracking
- 🌙 **Dark/Light Theme** - User preference support

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
- **Component-Based Architecture** with React 18
- **Context API** for state management (Auth, Theme)
- **Tailwind CSS** for modern, responsive design
- **TypeScript** for type safety and better development experience

### **Backend (Firebase Functions + TypeScript)**
- **MVC Pattern** with clear separation of concerns
- **Google Gemini AI Service** for intelligent conversations
- **AutoML Service** for personalized recommendations
- **Encryption Service** for data security
- **Session Management** for chat tracking

### **Database (Firestore)**
- **Encrypted User Data** with AES-256-GCM encryption
- **Chat Session Tracking** with subcollections
- **Real-time Updates** for seamless user experience

## 🚀 Quick Start

### **Prerequisites**
- **Node.js 22+** (recommended) or Node.js 18+
- **npm 8+** or **yarn**
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Google Cloud Project** with Vertex AI enabled
- **Firebase Project** with Functions and Firestore

### **Option 1: Test with Production Backend (Recommended)**

**No code changes needed!** Test your app locally while using production backend:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd manoday-Eeshan

# 2. Install dependencies
npm install
cd frontend && npm install
cd ../backend/functions && npm install

# 3. Start frontend locally
cd ../../frontend
npm start
```

**What happens:**
- ✅ Frontend runs on `http://localhost:3000`
- ✅ Backend calls production Firebase functions
- ✅ Real production database
- ✅ Test with actual deployed code

### **Option 2: Test with Local Emulators**

**Requires code changes** to point to local emulators:

```bash
# 1. Start Firebase emulators
cd /path/to/manoday-Eeshan
firebase emulators:start --only functions,firestore,ui

# 2. Update API URLs in Chatbot.tsx (see Configuration section)
# 3. Start frontend
cd frontend && npm start
```

## 🔧 Configuration

### **Required API Keys & Credentials**

#### **1. Google Gemini API**
- **Get API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`

#### **2. Google Cloud AutoML**
- **Project ID**: Your Google Cloud project ID
- **Model ID**: Your AutoML model ID from Vertex AI
- **Region**: Your model's region (e.g., `asia-south1`, `us-central1`)
- **Service Account**: JSON key file with proper permissions

#### **3. Firebase Configuration**
- **Project ID**: Your Firebase project ID
- **API Key**: Firebase project API key
- **Auth Domain**: Your Firebase auth domain
- **Storage Bucket**: Your Firebase storage bucket

### **Configuration Files**

#### **Backend Configuration** (`backend/functions/src/config.ts`)
```typescript
export const config = {
  gemini: {
    apiKey: process.env.FIREBASE_CONFIG_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent'
  },
  automl: {
    projectId: process.env.FIREBASE_CONFIG_AUTOML_PROJECT_ID || 'YOUR_GOOGLE_CLOUD_PROJECT_ID',
    modelId: process.env.FIREBASE_CONFIG_AUTOML_MODEL_ID || 'YOUR_AUTOML_MODEL_ID',
    endpoint: process.env.FIREBASE_CONFIG_AUTOML_ENDPOINT || 'YOUR_AUTOML_ENDPOINT',
    serviceAccountEmail: process.env.FIREBASE_CONFIG_AUTOML_SERVICE_ACCOUNT_EMAIL || 'YOUR_SERVICE_ACCOUNT_EMAIL',
    privateKey: process.env.FIREBASE_CONFIG_AUTOML_PRIVATE_KEY || 'YOUR_PRIVATE_KEY'
  }
};
```

#### **Frontend Configuration** (`frontend/src/firebase/config.ts`)
```typescript
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 🌐 API Endpoints

### **Core Functions**

| Function | Endpoint | Purpose | Method |
|----------|----------|---------|---------|
| **Gemini** | `/gemini` | AI-powered wellness conversations | POST |
| **AutoML** | `/automl` | Personalized activity recommendations | POST |
| **Store Insights** | `/storeEncryptedInsights` | Save encrypted wellness data | POST |
| **Get Insights** | `/getEncryptedInsights` | Retrieve user wellness history | POST |
| **Health Check** | `/health` | Service health monitoring | GET |

### **API Request/Response Examples**

#### **Gemini Chat**
```typescript
// Request
{
  "message": "I'm feeling anxious today",
  "conversationHistory": ["Hello", "How are you feeling?"],
  "wellnessData": { "mood": "Anxious" }
}

// Response
{
  "success": true,
  "data": {
    "response": "I understand anxiety can be really challenging...",
    "extractedData": { "mood": "Anxious" },
    "updatedWellnessData": { "mood": "Anxious" }
  }
}
```

#### **AutoML Recommendation**
```typescript
// Request
{
  "features": {
    "mood": "Sad",
    "sleepHours": "5",
    "stressLevel": "High"
  }
}

// Response
{
  "success": true,
  "data": {
    "recommendation": "Try a 10-minute meditation session",
    "confidence": 0.85
  }
}
```

## 🚀 Deployment

### **Production Deployment**

#### **1. Deploy Backend Functions**
```bash
cd backend/functions

# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

#### **2. Deploy Frontend**
```bash
cd ../../frontend

# Build production bundle
npm run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

### **Expected Deployment Output**
```
✔  functions[gemini(us-central1)] Successful update operation.
✔  functions[automl(us-central1)] Successful update operation.
✔  functions[storeEncryptedInsights(us-central1)] Successful update operation.
✔  functions[getEncryptedInsights(us-central1)] Successful update operation.
✔  hosting[YOUR_PROJECT_ID]: release complete
```

## 🧪 Testing

### **Testing Strategies**

#### **1. Production Testing (No Code Changes)**
```bash
cd frontend
npm start
# Frontend runs locally, calls production backend
```

#### **2. Local Testing (Requires Code Changes)**
```typescript
// Update these lines in Chatbot.tsx:
// Line 102: getEncryptedInsights
const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/getEncryptedInsights`, {

// Line 143: storeEncryptedInsights  
const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/storeEncryptedInsights`, {

// Line 197: gemini
const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/gemini`, {

// Line 271: automl
const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/automl`, {
```

### **Testing Scenarios**

#### **Basic Functionality**
- [ ] User authentication (Google, GitHub, Microsoft)
- [ ] AI chat conversations
- [ ] Wellness parameter extraction
- [ ] Data encryption and storage
- [ ] AutoML recommendations

#### **Edge Cases**
- [ ] Invalid user inputs
- [ ] Network timeouts
- [ ] API quota limits
- [ ] Large conversation histories
- [ ] Special characters in messages

## 🔒 Security Features

### **Data Encryption**
- **AES-256-GCM** encryption for all user data
- **PBKDF2** key derivation using user email + salt
- **End-to-end encryption** - even developers cannot read user data
- **Authentication tags** for data integrity verification

### **Privacy Protection**
- **No chat history storage** - only encrypted wellness parameters
- **User-specific encryption keys** derived from email
- **Session isolation** between different users
- **Firebase security rules** for database access control

## 📱 User Experience

### **Wellness Parameters Tracked**
1. **Mood** - Emotional state (Sad, Anxious, Happy, Neutral, Stressed)
2. **Sleep Hours** - Nightly sleep duration (1-10 hours)
3. **Stress Level** - Current stress (Low, Medium, High)
4. **Academic Pressure** - Educational stress (Low, Medium, High)
5. **Social Support** - Available support network (Weak, Average, Strong)
6. **Loneliness** - Social connection feelings (Never, Sometimes, Often)
7. **Confidence Level** - Self-esteem (Low, Medium, High)
8. **Hobbies Interest** - Recreational activities (Sports, Music, Reading, Art, Travel, None)
9. **Openness to Journaling** - Willingness to write (Yes, No)
10. **Professional Help** - Therapy readiness (Yes, No)

### **AI Features**
- **Empathetic Responses** - 5-6 line supportive messages
- **Intelligent Extraction** - Context-aware parameter mapping
- **Natural Conversations** - Flowing dialogue, not questionnaires
- **Personalized Recommendations** - AutoML-based activity suggestions

## 🔄 Development Workflow

### **1. Local Development (Emulators)**
```bash
# Terminal 1: Start emulators
firebase emulators:start --only functions,firestore,ui

# Terminal 2: Start frontend
cd frontend && npm start
```

### **2. Production Testing (No Code Changes)**
```bash
# Terminal 1: Start frontend only
cd frontend && npm start
# Frontend calls deployed functions automatically
```

### **3. Deploy Changes**
```bash
# Build and deploy backend
cd backend/functions
npm run build
firebase deploy --only functions

# Build and deploy frontend
cd ../../frontend
npm run build
cd ..
firebase deploy --only hosting
```

## 🚨 Troubleshooting

### **Common Issues & Solutions**

#### **1. Firebase Functions Not Starting**
```bash
# Check Node.js version
node --version  # Should be 22+

# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### **2. Frontend Build Errors**
```bash
# Clear build cache
rm -rf build/
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

#### **3. Authentication Issues**
- Verify Firebase config in `frontend/src/firebase/config.ts`
- Check OAuth providers in Firebase Console
- Ensure correct project ID and API keys

#### **4. API Call Failures**
- Verify credentials in `backend/functions/src/config.ts`
- Check if Firebase emulators are running
- Ensure correct backend URLs in frontend
- Verify project ID matches in all configurations

#### **5. Chatbot Not Working**
**Most Common Issue - Check These First:**

1. **Verify Chatbot.tsx URLs**: Update project ID in all 4 API calls
2. **Check Browser Console**: Look for 404 errors
3. **Verify Project ID**: Match Firebase project ID exactly
4. **Check Region**: Ensure region matches Firebase Functions region



## 📁 Project Structure

```
manoday-Eeshan/
├── .firebaserc                    # Firebase project configuration
├── firebase.json                  # Firebase hosting & functions config
├── package.json                   # Root dependencies
├── SETUP_GUIDE.md                # Comprehensive setup instructions
├── backend/
│   └── functions/
│       ├── src/                   # TypeScript source code
│       │   ├── controllers/       # HTTP request handlers
│       │   ├── services/          # Business logic (Gemini, AutoML, Encryption)
│       │   ├── types/             # TypeScript interfaces
│       │   └── config.ts          # API keys and configuration
│       ├── lib/                   # Compiled JavaScript
│       └── package.json           # Backend dependencies
└── frontend/
    ├── src/
    │   ├── components/            # React components
    │   │   ├── Chatbot.tsx        # Main chat interface
    │   │   ├── LoginPage.tsx      # Authentication page
    │   │   ├── ProtectedRoute.tsx # Route protection
    │   │   └── ThemeToggle.tsx    # Theme switching
    │   ├── contexts/              # React contexts
    │   │   ├── AuthContext.tsx    # Authentication state
    │   │   └── ThemeContext.tsx   # Theme state
    │   ├── firebase/              # Firebase configuration
    │   │   └── config.ts          # Firebase project settings
    │   ├── services/              # API services
    │   │   └── encryption.service.ts # Client-side encryption
    │   └── App.tsx                # Main application component
    ├── tsconfig.json              # TypeScript configuration
    └── package.json               # Frontend dependencies
```

## 🤝 Contributing

### **Development Setup**
1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open** a Pull Request

### **Code Standards**
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Meaningful commit messages**
- **Comprehensive testing**

## 📚 Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Vertex AI AutoML Documentation](https://cloud.google.com/vertex-ai/docs/automl)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions via GitHub Discussions
- **Email**: support@manoday.app

---

**🌟 Built with ❤️ for mental wellness and AI innovation**

**Manoday** - Empowering mental health through intelligent AI conversations and personalized support.

---

## 🎯 Quick Reference

### **Essential Commands**
```bash
# Install dependencies
npm install

# Start development
npm start                    # Frontend only
firebase emulators:start     # Backend emulators

# Build for production
npm run build               # Frontend
cd backend/functions && npm run build  # Backend

# Deploy
firebase deploy --only functions  # Backend
firebase deploy --only hosting    # Frontend
```

### **Key URLs**
- **Production**: `https://YOUR_PROJECT_ID.web.app`
- **Local Frontend**: `http://localhost:3000`
- **Local Backend**: `http://localhost:5001`
- **Emulator UI**: `http://localhost:4001`

### **Critical Files**
- **Backend Config**: `backend/functions/src/config.ts`
- **Frontend Config**: `frontend/src/firebase/config.ts`
- **API Calls**: `frontend/src/components/Chatbot.tsx` (lines 102, 143, 197, 271)
- **Firebase Config**: `.firebaserc`
