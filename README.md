# Manoday Mental Wellness App

## Overview

Manoday is an AI-powered mental wellness application that combines:
- 🤖 AI-Powered Conversations using Google Gemini AI
- 🎯 Personalized Recommendations using Google AutoML
- 🔐 Secure Firebase Authentication
- 📱 Modern React Frontend with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Firebase CLI
- Google Cloud Project with Vertex AI

### Installation

```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or install separately:
npm run frontend:install    # Frontend dependencies
npm run backend:install     # Backend dependencies

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools
```

### **3. Firebase Setup**
```bash
# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select your project and enable:
# - Functions
# - Firestore
# - Hosting (optional)
```

## 🔧 Configuration

### Backend Setup
1. Create `backend/functions/config.ts` with your API keys
2. Set Firebase environment variables
3. Configure Google Cloud service account

### Frontend Setup
1. Configure Firebase directly in `frontend/src/firebase/config.ts`
2. Set backend URL for development in the code
3. Configure OAuth providers in Firebase console

## 🏗️ Architecture

### Backend (MVC Pattern)
- **Controllers**: Handle HTTP requests
- **Services**: Business logic (Gemini AI, AutoML)
- **Types**: TypeScript interfaces

### Frontend (Component-Based)
- **Chatbot**: Main conversation interface
- **AuthContext**: Authentication state management
- **Services**: API communication

## 🔌 API Endpoints

### `/gemini` - AI Chat
- **POST**: Wellness conversations with Gemini AI
- **Input**: message, conversationHistory, wellnessData
- **Output**: response, extractedData, updatedWellnessData

### `/automl` - Recommendations
- **POST**: Activity recommendations using AutoML
- **Input**: features (wellness data)
- **Output**: recommendation, confidence

## 🚀 Available Scripts

### Development
- `npm run dev`: Start both frontend and backend
- `npm run frontend:start`: Frontend only (port 3000)
- `npm run backend:start`: Backend only (port 5001)

## 🔧 Configuration Details

### Backend Configuration (`backend/functions/config.ts`)

## 🔧 Configuration Details

### Backend Configuration
Create `backend/functions/config.ts` with your API keys:

```typescript
export const config = {
  gemini: {
    apiKey: 'YOUR_GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent'
  },
  automl: {
    projectId: 'YOUR_GOOGLE_CLOUD_PROJECT_ID',
    modelId: 'YOUR_AUTOML_MODEL_ID',
    endpoint: 'YOUR_AUTOML_ENDPOINT',
    serviceAccountEmail: 'YOUR_SERVICE_ACCOUNT_EMAIL',
    privateKey: 'YOUR_PRIVATE_KEY'
  }
};
```

### Frontend Configuration
1. **Copy the example config**:
```bash
cd frontend/src/firebase
cp config.example.ts config.ts
```

2. **Update `frontend/src/firebase/config.ts`** with your Firebase project settings:
```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

3. **Get Firebase config values**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Click on the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"
   - Scroll down to "Your apps" section
   - Copy the config values

## 📁 Project Structure



## 🚀 Getting Started

### **Step 1: Install Dependencies**
```bash
# Install all dependencies
npm run install:all

# Verify installation
npm run frontend:build
npm run backend:build
```

### **Step 2: Get Your Credentials**

#### **A. Google Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key for `backend/functions/config.ts`

#### **B. Google Cloud AutoML Credentials**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Enable Vertex AI API
4. Go to "IAM & Admin" → "Service Accounts"
5. Create a new service account or use existing one
6. Download the JSON key file
7. Extract the values for `backend/functions/config.ts`

#### **C. Firebase Project Settings**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Copy the config values for `frontend/src/firebase/config.ts`

### **Step 3: Configure Files**
```bash
# Backend configuration
cd backend/functions
cp src/config.example.ts src/config.ts
# Edit src/config.ts with your credentials

# Frontend configuration
cd ../../frontend/src/firebase
cp config.example.ts config.ts
# Edit config.ts with your Firebase settings
```

### **Step 4: Start Development**
```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run frontend:start    # Frontend on http://localhost:3000
npm run backend:start     # Backend on http://localhost:5001
```

### **Step 5: Test the Application**
1. Open http://localhost:3000 in your browser
2. Try logging in with Google/GitHub/Microsoft
3. Start a conversation with the chatbot
4. Verify AutoML recommendations work

## 📚 Additional Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Google Gemini API](https://ai.google.dev/docs)
- [Vertex AI AutoML](https://cloud.google.com/vertex-ai/docs/automl)
- [React Documentation](https://react.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

**🌟 Built with ❤️ for mental wellness and AI innovation**

For support: support@manoday.app

## 🔧 Troubleshooting

### Common Issues

#### 1. Firebase Functions Not Starting
- Check Node.js version (should be 22): `node --version`
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

#### 2. Frontend Build Errors
- Clear build cache: `rm -rf build/ && npm run frontend:build`
- Check TypeScript errors: `npx tsc --noEmit`

#### 3. Authentication Issues
- Verify Firebase config in `frontend/src/firebase/config.ts`
- Check if OAuth providers are enabled in Firebase Console
- Ensure correct project ID and API keys

#### 4. Backend API Errors
- Verify credentials in `backend/functions/config.ts`
- Check if Firebase emulators are running
- Ensure correct backend URL in frontend
