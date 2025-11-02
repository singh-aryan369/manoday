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
- 🏥 **Professional Help Locator** - Find nearby Indian mental health centers with Google Maps
- 📞 **Real Contact Information** - Actual phone numbers for local Indian helplines
- 🇮🇳 **India-Specific Support** - 10 national Indian helplines + local center discovery
- 🎤 **Voice-to-Text Journaling** - Speak your thoughts with Google Speech-to-Text
- 📝 **Encrypted Journaling** - Secure personal space for thoughts and reflections
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
- **Professional Help Service** for location-based Indian mental health centers
- **Google Maps Integration** for real-time Indian helpline discovery with India-only filtering
- **Speech-to-Text Service** for voice-to-text journaling
- **Journal Service** for encrypted personal journaling
- **Encryption Service** for data security
- **Session Management** for chat tracking

### **Database (Firestore)**
- **Encrypted User Data** with AES-256-GCM encryption
- **Chat Session Tracking** with subcollections
- **Encrypted Journal Entries** with user-specific encryption keys
- **Real-time Updates** for seamless user experience

## 🇮🇳 Indian Mental Health Support

### **National Helplines (Available 24/7)**
1. **KIRAN Mental Health Rehabilitation Helpline** - `1800-599-0019` (Government of India)
2. **Vandrevala Foundation Helpline** - `1860-2662-345 / 1800-2333-330`
3. **iCall Psychosocial Helpline** - `9152987821`
4. **Sneha Suicide Prevention Centre** - `044-24640050 / 044-24640060`
5. **AASRA Suicide Prevention Helpline** - `91-22-27546669 / 91-22-27546668`
6. **National Commission for Women Helpline** - `181`
7. **Childline India Foundation** - `1098`
8. **National Mental Health Helpline (NIMHANS)** - `080-46110007`
9. **Roshni Helpline** - `040-66202000 / 040-66202001`
10. **Sumaitri Suicide Prevention Centre** - `011-23389090`

### **Local Center Discovery**
- **Google Maps Integration** finds real Indian mental health centers
- **India-only filtering** ensures no international results
- **Real phone numbers and addresses** for local support
- **25km radius search** for nearby professional help

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ 
- **npm** 9+
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Google Cloud Project** with enabled APIs:
  - Gemini API
  - AutoML API
  - Google Maps API
  - Speech-to-Text API

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd manoday-journal
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure Firebase**
   ```bash
   firebase login
   firebase use --add
   ```

## 🔧 Development Commands

### **Local Development (Recommended)**

**Start everything locally with Firebase Emulators:**

```bash
# Terminal 1: Start Firebase Emulators
npm run emulators:start:ui

# Terminal 2: Start Frontend
cd frontend && npm start
```

**Access Points:**
- **Frontend:** `http://localhost:3000`
- **Firebase Emulator UI:** `http://localhost:4001`
- **Functions:** `http://localhost:5001/manoday-dev-476208/us-central1/[function-name]`

**Features in Local Mode:**
- ✅ **No email verification** (Firebase Auth Emulator)
- ✅ **Real-time logs** in terminal
- ✅ **Fast development** with hot reload
- ✅ **All functions work** (Gemini, AutoML, Journal, etc.)

### **Production Deployment**

**Deploy to Firebase Hosting:**

```bash
# Build frontend
npm run frontend:build

# Deploy functions
firebase deploy --only functions

# Deploy frontend
firebase deploy --only hosting
```

**Access Points:**
- **Frontend:** `https://manoday-dev-476208.web.app`
- **Functions:** `https://[function-name]-tipjtjdkwq-uc.a.run.app`

**Features in Production Mode:**
- ✅ **Real Google OAuth** with email verification
- ✅ **Production Firebase services**
- ✅ **Scalable cloud infrastructure**
- ✅ **Real email notifications**

### **Alternative Commands**

**Concurrent Development (All-in-One):**
```bash
# Starts emulators and frontend with 10-second delay for emulator initialization
npm run dev:local
```

**Note:** The `dev:local` command includes a 10-second delay to ensure emulators are ready before starting the frontend. For faster development, use separate terminals as shown above.

**Individual Services:**
```bash
# Frontend only
npm run frontend:start

# Backend only  
npm run backend:start

# Emulators only
npm run emulators:start
```

## 🔧 Environment Configuration

### **Automatic Local/Production Detection**

The app automatically detects if it's running locally and switches URLs accordingly. No environment files needed!

**Local Mode Triggers:**
- `NODE_ENV === 'development'`
- `REACT_APP_DEVELOPMENT_MODE === 'true'`
- `window.location.hostname === 'localhost'`

**Production Mode Triggers:**
- `NODE_ENV === 'production'`
- Running on deployed Firebase hosting

### **URL Configuration Reference**

| Environment | Frontend URL | Backend URL | Database | Auth |
|-------------|--------------|-------------|----------|------|
| **Local Development** | `http://localhost:3000` | `http://localhost:5001` | `localhost:8081` | `localhost:9099` |
| **Production** | `https://your-app.web.app` | `https://your-functions.run.app` | Firebase Cloud | Firebase Cloud |

### **Switching Between Local and Production**

**To force local mode:**
```bash
# Frontend
REACT_APP_DEVELOPMENT_MODE=true npm start

# Backend
NODE_ENV=development npm run serve
```

**To force production mode:**
```bash
# Frontend
NODE_ENV=production npm start

# Backend
NODE_ENV=production npm run serve
```

## 📜 Available Scripts

### **Root Level Scripts**
```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:local        # Start both with local emulators
npm run setup:local      # Setup local development environment

# Emulators
npm run emulators:start        # Start all Firebase emulators
npm run emulators:start:ui    # Start emulators (functions, firestore, auth)

# Installation
npm run install:all      # Install all dependencies
npm run frontend:install # Install frontend dependencies
npm run backend:install  # Install backend dependencies

# Building
npm run build            # Build frontend for production
npm run frontend:build   # Build frontend only
npm run backend:build    # Build backend only

# Deployment
npm run deploy           # Deploy everything to Firebase
npm run deploy:hosting  # Deploy frontend only
npm run deploy:functions # Deploy backend only
npm run deploy:firestore # Deploy database rules only
```

### **Frontend Scripts** (`frontend/`)
```bash
npm start                # Start development server (production backend)
npm run start:local      # Start with local backend
npm run build            # Build for production
npm run build:local     # Build for local development
npm run deploy           # Deploy to Firebase hosting
npm run deploy:local     # Deploy local build
```

### **Backend Scripts** (`backend/functions/`)
```bash
npm run serve            # Start with Firebase emulators
npm run serve:local      # Start with local emulators
npm run start:local      # Alias for serve:local
npm run build            # Build TypeScript
npm run build:watch      # Build with watch mode
npm run deploy           # Deploy to Firebase Functions
npm run logs             # View function logs
```

## 🐛 Troubleshooting Local Development

### **Common Issues & Solutions**

#### **1. Emulator Connection Issues**
```bash
# Problem: Frontend can't connect to emulators
# Solution: Check emulator status
firebase emulators:start --only functions,firestore,auth

# Check if ports are available
lsof -i :3000  # Frontend
lsof -i :5001  # Functions
lsof -i :8081  # Firestore
lsof -i :9099  # Auth
lsof -i :4000  # Firebase Emulator UI

# Access Firebase Emulator UI
# The UI automatically opens at http://localhost:4000
# If it doesn't open, manually navigate to http://localhost:4000
```

#### **2. Environment Variable Issues**
```bash
# Problem: App not detecting local mode
# Solution: Check environment variables
echo $NODE_ENV
echo $REACT_APP_DEVELOPMENT_MODE

# Force local mode
REACT_APP_DEVELOPMENT_MODE=true npm start
```

#### **3. Firebase CLI Issues**
```bash
# Problem: Firebase commands not working
# Solution: Login and select project
firebase login
firebase use --add

# Check project status
firebase projects:list
firebase use manoday-dev-476208
```

#### **4. Port Conflicts**
```bash
# Problem: Port already in use
# Solution: Kill processes or use different ports
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:5001)

# Or modify firebase.json for different ports
```

#### **5. Build Issues**
```bash
# Problem: TypeScript compilation errors
# Solution: Clean and rebuild
cd backend/functions
rm -rf lib/
npm run build

# Check for missing dependencies
npm install
```

### **Debug Mode**

Enable debug logging for troubleshooting:

```bash
# Frontend debug mode
DEBUG=* npm start

# Backend debug mode
DEBUG=* npm run serve:local

# Firebase emulator debug
firebase emulators:start --debug
```

### **Reset Local Environment**

If everything is broken, reset your local environment:

```bash
# Clean everything
rm -rf node_modules frontend/node_modules backend/functions/node_modules

# Reinstall and setup
npm run setup:local
npm run install:all
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

#### **4. Google Maps API**
- **API Key**: Google Maps API key for Places API
- **Enabled APIs**: Places API, Maps JavaScript API, Geocoding API
- **Usage**: Location-based mental health center discovery

#### **5. Google Speech-to-Text API**
- **Service Account Key**: JSON key file with Speech-to-Text permissions
- **File Location**: Must be placed in `backend/functions/service-account-key.json`
- **Usage**: Voice-to-text journaling feature

### **Service Account Key Setup**

#### **Step 1: Download Service Account Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Find your Speech-to-Text service account
4. Click **Actions** → **Manage Keys**
5. Click **Add Key** → **Create New Key** → **JSON**
6. Download the JSON file

#### **Step 2: Place Key File in Backend**
```bash
# Navigate to backend functions directory
cd backend/functions

# Place your service account key file here
# IMPORTANT: File must be named exactly 'service-account-key.json'
cp /path/to/your/downloaded/key.json service-account-key.json
```

#### **Step 3: Verify File Location**
Your backend directory should look like this:
```
backend/functions/
├── src/
├── lib/
├── package.json
├── service-account-key.json  ← Your key file goes here
└── tsconfig.json
```

#### **Step 4: Update .gitignore (Security)**
```bash
# Add to .gitignore to prevent accidental commits
echo "backend/functions/service-account-key.json" >> .gitignore
```

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
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    defaultRadius: 50000, // 50km in meters
    maxResults: 20
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

// Google Maps API Configuration for Professional Help
export const googleMapsConfig = {
  apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
  defaultRadius: 50000, // 50km in meters
  maxResults: 20
};
```

## 🌐 API Endpoints

### **Core Functions**

| Function | Endpoint | Purpose | Method |
|----------|----------|---------|---------|
| **Gemini** | `/gemini` | AI-powered wellness conversations | POST |
| **AutoML** | `/automl` | Personalized activity recommendations | POST |
| **Professional Help** | `/professionalHelp` | Find nearby mental health centers | POST/GET |
| **Speech-to-Text** | `/speechToText` | Voice-to-text transcription | POST/GET |
| **Journal** | `/journal` | Encrypted journal CRUD operations | POST/GET |
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

#### **Professional Help Search**
```typescript
// Request
{
  "latitude": 25.4273,
  "longitude": 81.7709,
  "radius": 50,
  "limit": 20
}

// Response
{
  "centers": [
    {
      "id": "google-ChIJY6esiTC1mjkRC57TXDmwYaQ",
      "name": "Dr Chhitij Srivastava (Psychiatrist)",
      "address": "Prayagraj, Uttar Pradesh, India",
      "phoneNumber": "094525 86864",
      "website": "https://allahabadcdc.wixsite.com/allahabadcdc",
      "distance": 9.7,
      "specialties": ["Support Services", "Health Services"],
      "is24Hours": false
    }
  ],
  "totalFound": 20,
  "searchRadius": 50
}
```

#### **Speech-to-Text Transcription**
```typescript
// Request
{
  "audioData": "base64-encoded-audio-data",
  "language": "en-US",
  "sampleRate": 44100
}

// Response
{
  "success": true,
  "data": {
    "transcript": "I'm feeling anxious about my upcoming exam",
    "confidence": 0.95,
    "language": "en-US"
  }
}
```

#### **Journal Entry**
```typescript
// Request
{
  "action": "create",
  "title": "My thoughts today",
  "content": "I'm feeling grateful for the support I received"
}

// Response
{
  "success": true,
  "data": {
    "journalId": "journal_123456789",
    "title": "My thoughts today",
    "content": "I'm feeling grateful for the support I received",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
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
✔  functions[professionalHelp(us-central1)] Successful update operation.
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
- [ ] Professional help locator
- [ ] Location-based mental health center discovery
- [ ] Real contact information display
- [ ] Voice-to-text journaling
- [ ] Encrypted journal CRUD operations
- [ ] Speech-to-text transcription

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

### **Professional Help Features**
- **Location-Based Search** - Find mental health centers near user
- **Real Contact Information** - Actual phone numbers and websites
- **Google Maps Integration** - Powered by Google Places API
- **24/7 Availability** - Crisis centers and emergency helplines
- **Specialty Filtering** - Mental health, crisis intervention, therapy

### **Journaling Features**
- **Voice-to-Text Input** - Speak your thoughts using Google Speech-to-Text
- **Encrypted Storage** - All journal entries encrypted with AES-256-GCM
- **CRUD Operations** - Create, read, update, and delete journal entries
- **User-Specific Encryption** - Each user's data encrypted with unique keys
- **Real-time Transcription** - Live speech recognition in the journal interface

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
│       │   │   ├── gemini.controller.ts
│       │   │   ├── automl.controller.ts
│       │   │   └── professional-help.controller.ts
│       │   ├── services/          # Business logic
│       │   │   ├── gemini.service.ts
│       │   │   ├── automl.service.ts
│       │   │   ├── professional-help.service.ts
│       │   │   └── encryption.service.ts
│       │   ├── types/             # TypeScript interfaces
│       │   │   └── professional-help.types.ts
│       │   ├── utils/             # Utility functions
│       │   │   └── logger.ts
│       │   └── config.ts          # API keys and configuration
│       ├── lib/                   # Compiled JavaScript
│       └── package.json           # Backend dependencies
└── frontend/
    ├── src/
    │   ├── components/            # React components
    │   │   ├── Chatbot.tsx        # Main chat interface
    │   │   ├── LoginPage.tsx      # Authentication page
    │   │   ├── ProfessionalHelpPage.tsx # Professional help locator
    │   │   ├── ProtectedRoute.tsx # Route protection
    │   │   └── ThemeToggle.tsx    # Theme switching
    │   ├── contexts/              # React contexts
    │   │   ├── AuthContext.tsx    # Authentication state
    │   │   └── ThemeContext.tsx   # Theme state
    │   ├── firebase/              # Firebase configuration
    │   │   └── config.ts          # Firebase project settings
    │   ├── services/              # API services
    │   │   ├── encryption.service.ts # Client-side encryption
    │   │   └── ProfessionalHelpService.ts # Professional help API
    │   ├── types/                 # TypeScript interfaces
    │   │   └── ProfessionalHelpTypes.ts
    │   ├── config/                # Configuration files
    │   │   └── professionalHelpConfig.ts
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

## 🔄 Environment Detection

The app **automatically switches** between local and production based on:

| Environment | Detection Method | API Endpoints |
|-------------|------------------|---------------|
| **Local** | `localhost` hostname OR `NODE_ENV=development` | `http://localhost:5001/...` |
| **Production** | Deployed hostname | `https://[function-name]-tipjtjdkwq-uc.a.run.app` |

**No manual configuration needed!** The app detects the environment and uses appropriate endpoints.

## 📋 Available Scripts

### **Root Level Commands**
```bash
npm run install:all          # Install all dependencies
npm run dev:local           # Start local development (frontend + backend)
npm run frontend:start      # Start frontend only
npm run backend:start      # Start backend only
npm run deploy:all          # Deploy to production
npm run emulators:start     # Start Firebase emulators
npm run emulators:start:ui  # Start Firebase emulators with UI
```

### **Frontend Commands** (`frontend/`)
```bash
npm start                   # Start development server
npm run build              # Build for production
npm run build:local        # Build for local development
npm run deploy:local       # Deploy frontend locally
```

### **Backend Commands** (`backend/functions/`)
```bash
npm run build              # Build TypeScript
npm run serve              # Start local functions
npm run serve:local        # Start with local emulators
npm run start:local        # Alias for serve:local
npm run deploy             # Deploy to Firebase
```

## 🛠️ Troubleshooting

### **Common Issues**

**1. Port Conflicts**
```bash
# Kill existing processes
pkill -f firebase
pkill -f "react-scripts"

# Restart emulators
npm run emulators:start:ui
```

**2. Authentication Issues**
- **Local:** No email verification required (Firebase Emulator)
- **Production:** Real Google OAuth with email verification
- Clear browser cache if experiencing double authentication

**3. API Connection Issues**
- Check Firebase Emulator UI: `http://localhost:4001`
- Verify all emulators are running (Functions, Firestore, Auth)
- Check console logs for connection status

**4. Environment Detection**
- Ensure `localhost` in URL for local development
- Check `NODE_ENV` environment variable
- Verify `REACT_APP_DEVELOPMENT_MODE=true` if needed

### **Debug Mode**

For detailed logging:
```bash
# Start with debug mode
firebase emulators:start --only functions,firestore,auth --debug
```

### **Clear Emulator Data**

If you need fresh emulator data:
```bash
# Clear all emulator data
firebase emulators:exec --only auth,firestore "echo 'Clearing data'" --import=./emulator-data --export-on-exit
```

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
