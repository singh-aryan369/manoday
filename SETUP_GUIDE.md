# 🚀 Manoday App - Complete Setup Guide

## 📋 Overview
This guide documents the complete setup process for the Manoday mental wellness app, including all fixes for TypeScript errors, CORS issues, and project configuration problems.

## 🎯 What We Fixed
1. **TypeScript Configuration Issues** - Babel types and Node.js types
2. **Project ID Mismatch** - Backend and frontend using different Firebase projects
3. **Build Failures** - Object.entries and process object not recognized
4. **CORS Configuration** - Backend already properly configured
5. **Professional Help Feature** - Added location-based Indian mental health center discovery
6. **Google Maps Integration** - Real-time Indian helpline center search with contact information
7. **India-Specific Support** - 10 national Indian helplines with India-only filtering
8. **Voice-to-Text Journaling** - Google Speech-to-Text integration for voice journaling

## 🔧 Step-by-Step Setup

### **Step 1: Install Dependencies**

#### Root Dependencies
```bash
cd /Users/aryansingh/Downloads/manoday-Eeshan
npm install
```

#### Backend Dependencies
```bash
cd backend/functions
npm install
```

#### Frontend Dependencies
```bash
cd ../../frontend
npm install
```

### **Step 2: Fix TypeScript Configuration**

#### Update `frontend/tsconfig.json`
**Before (Problematic):**
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "types": [],
    // ... other options
  }
}
```

**After (Fixed):**
```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "es6", "es2017"],
    "types": ["node"],
    // ... other options
  }
}
```

#### Install Missing Type Definitions
```bash
cd frontend
npm install --save-dev @types/node
```

**What This Fixed:**
- ✅ `Object.entries` not available (es5 → es2017)
- ✅ `process` object not recognized (added @types/node)
- ✅ Babel type definition errors (added types array)

### **Step 3: Build Backend Functions**

```bash
cd backend/functions
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

### **Step 4: Start Firebase Emulators**

#### **IMPORTANT: Use Root Directory**
```bash
cd /Users/aryansingh/Downloads/manoday-Eeshan
firebase emulators:start --only functions,firestore,ui
```

**Why Root Directory Matters:**
- `.firebaserc` file is in root directory
- Contains correct project ID: `YOUR_PROJECT_ID`
- Ensures backend and frontend use same project

#### **❌ Don't Use This (Wrong Project ID):**
```bash
cd backend/functions
npm run serve
# This uses my-first-project-9e0be instead of YOUR_PROJECT_ID
```

### **Step 5: Start Frontend**

```bash
cd frontend
npm start
```

## 🌐 Service URLs

| Service | URL | Status |
|---------|-----|---------|
| **Frontend** | `http://localhost:3000` | ✅ React App |
| **Backend** | `http://localhost:5001` | ✅ Firebase Functions |
| **Emulator UI** | `http://localhost:4001` | ✅ Firebase Console |
| **Firestore** | `http://localhost:8081` | ✅ Database |

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

### **Local Center Discovery Features**
- **Google Maps Integration** finds real Indian mental health centers
- **India-only filtering** ensures no international results
- **Real phone numbers and addresses** for local support
- **25km radius search** for nearby professional help
- **Fallback to national helplines** when no local centers found

## 🔍 Verification Steps

### **1. Check Backend Health**
```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "services": {
    "auth": "configured",
    "gemini": "configured",
    "automl": "configured"
  }
}
```

### **2. Verify Project ID in Emulator Logs**
Look for this in your terminal:
```
✔  functions[us-central1-gemini]: http function initialized (http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/gemini).
✔  functions[us-central1-automl]: http function initialized (http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/automl).
```

**✅ Correct:** `YOUR_PROJECT_ID`
**❌ Wrong:** `my-first-project-9e0be`

### **3. Test Frontend Build**
```bash
cd frontend
npm run build
```

Should complete without TypeScript errors.

## 🚨 Common Issues & Solutions

### **Issue 1: "Cannot find name 'process'**
**Solution:** Install Node.js types
```bash
npm install --save-dev @types/node
```

### **Issue 2: "Property 'entries' does not exist on ObjectConstructor"**
**Solution:** Update TypeScript target to es2017
```json
"target": "es2017"
```

### **Issue 3: Google Login Fails**
**Solution:** Ensure emulators use correct project ID
- Use root directory: `firebase emulators:start`
- Don't use: `cd backend/functions && npm run serve`

### **Issue 4: CORS Errors**
**Solution:** Backend already configured with CORS headers
```typescript
response.set('Access-Control-Allow-Origin', '*');
response.set('Access-Control-Allow-Methods', 'GET, POST');
response.set('Access-Control-Allow-Headers', 'Content-Type');
```

## 📁 Project Structure

```
manoday-Eeshan/
├── .firebaserc                    # ✅ Firebase project config
├── firebase.json                  # ✅ Firebase hosting & functions
├── backend/
│   └── functions/
│       ├── src/                   # ✅ TypeScript source
│       ├── lib/                   # ✅ Compiled JavaScript
│       └── package.json           # ✅ Backend dependencies
└── frontend/
    ├── src/
    │   ├── components/            # ✅ React components
    │   ├── firebase/              # ✅ Firebase config
    │   └── contexts/              # ✅ Auth & theme contexts
    ├── tsconfig.json              # ✅ Fixed TypeScript config
    └── package.json               # ✅ Frontend dependencies
```

## 🔑 Key Configuration Files

### **`.firebaserc`**
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### **`frontend/src/firebase/config.ts`**
```typescript
const firebaseConfig = {
  apiKey: "Abcsdhwendnfmfjiei4893930230",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
projectId: "YOUR_PROJECT_ID",
  // ... other config
};
```

### **`backend/functions/src/config.ts`**
```typescript
export const config = {
  gemini: {
    apiKey: process.env.FIREBASE_CONFIG_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    // ... other config
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    defaultRadius: 50000, // 50km in meters
    maxResults: 20
  }
};
```

## 🎉 Success Indicators

- ✅ Frontend builds without errors
- ✅ Backend emulators start with correct project ID
- ✅ Health endpoint returns successful response
- ✅ No CORS errors in browser console
- ✅ Google login works properly
- ✅ Gemini AI responses are received
- ✅ AutoML recommendations work
- ✅ Professional help locator finds nearby centers
- ✅ Google Maps API returns real contact information
- ✅ Location-based search works correctly

## 🚀 Quick Start Commands

```bash
# Terminal 1: Backend
cd /Users/aryansingh/Downloads/manoday-Eeshan
firebase emulators:start --only functions,firestore,ui

# Terminal 2: Frontend
cd /Users/aryansingh/Downloads/manoday-Eeshan/frontend
npm start
```

## 🌐 Production Deployment Guide

### **Step 1: Deploy Backend Functions**

```bash
cd backend/functions

# Build the TypeScript code
npm run build

# Deploy to production Firebase
firebase deploy --only functions
```

**Expected Output:**
```
✔  functions[gemini(us-central1)] Successful update operation.
✔  functions[automl(us-central1)] Successful update operation.
✔  functions[professionalHelp(us-central1)] Successful update operation.
✔  functions[storeEncryptedInsights(us-central1)] Successful update operation.
✔  functions[getEncryptedInsights(us-central1)] Successful update operation.
```

### **Step 2: Deploy Frontend**

```bash
cd ../../frontend

# Build production bundle
npm run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

**Expected Output:**
```
✔  hosting[YOUR_PROJECT_ID]: release complete
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

### **Step 3: Verify Production URLs**

| Service | Production URL |
|---------|----------------|
| **Frontend** | `https://YOUR_PROJECT_ID.web.app` |
| **Gemini Function** | `https://gemini-tipjtjdkwq-uc.a.run.app` |
| **AutoML Function** | `https://automl-tipjtjdkwq-uc.a.run.app` |
| **Professional Help** | `https://professionalhelp-tipjtjdkwq-uc.a.run.app` |
| **Store Insights** | `https://storeencryptedinsights-tipjtjdkwq-uc.a.run.app` |
| **Get Insights** | `https://getencryptedinsights-tipjtjdkwq-uc.a.run.app` |

## 🧪 Testing Guide

### **Option 1: Test with Production Backend (Recommended)**

**No code changes needed!** Test your app locally while using production backend:

```bash
cd frontend
npm start
```

**What happens:**
- ✅ Frontend runs on `http://localhost:3000`
- ✅ Backend calls production Firebase functions
- ✅ Real production database
- ✅ Test with actual deployed code

**Best for:**
- Testing production functionality
- No configuration changes
- Immediate testing

### **Option 2: Test with Local Emulators**

**Requires code changes** to point to local emulators:

```typescript
// In frontend/src/components/Chatbot.tsx, change ALL API calls:

// 1. Line 197: Gemini API call
const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/gemini`, {
  // instead of:
  // https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/gemini
});

// 2. Line 271: AutoML API call  
const recommendation = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/automl`, {
  // instead of:
  // https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/automl
});

// 3. Line 143: Store Encrypted Insights
const storeResponse = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/storeEncryptedInsights`, {
  // instead of:
  // https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/storeEncryptedInsights
});

// 4. Line 102: Get Encrypted Insights
const getResponse = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/getEncryptedInsights`, {
  // instead of:
  // https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getEncryptedInsights
});
```

**Best for:**
- Testing backend changes before deployment
- Debugging backend functions locally
- Avoiding production API quotas

## 🔄 Development Workflow

### **1. Local Development (Emulators)**
```bash
# Terminal 1: Start emulators
firebase emulators:start --only functions,firestore,ui

# Terminal 2: Start frontend
cd frontend && npm start

# Test with local backend
```

### **2. Production Testing (No Code Changes)**
```bash
# Terminal 1: Start frontend only
cd frontend && npm start

# Test with production backend
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

## 🚨 Deployment Checklist

Before deploying, ensure:

- [ ] **Backend builds successfully** (`npm run build`)
- [ ] **Frontend builds successfully** (`npm run build`)
- [ ] **All TypeScript errors resolved**
- [ ] **Environment variables configured**
- [ ] **Firebase project selected** (`YOUR_PROJECT_ID`)
- [ ] **API keys valid** (Gemini, Firebase)

## 🔍 Post-Deployment Testing

### **1. Test Production Frontend**
- Visit: `https://YOUR_PROJECT_ID.web.app`
- Verify all features work
- Check browser console for errors

### **2. Test Production Backend**
```bash
# Test health endpoint
curl https://health-tipjtjdkwq-uc.a.run.app

# Test Gemini function
curl -X POST https://gemini-tipjtjdkwq-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","conversationHistory":[],"wellnessData":{}}'
```

### **3. Monitor Firebase Console**
- Check Functions logs for errors
- Verify Firestore database updates
- Monitor function execution times

## 📱 Testing Scenarios

### **Basic Functionality**
- [ ] User registration/login
- [ ] Chat with Gemini AI
- [ ] Parameter extraction
- [ ] Data storage in Firestore
- [ ] AutoML recommendations
- [ ] Professional help locator
- [ ] Location-based mental health center search
- [ ] Real contact information display

### **Edge Cases**
- [ ] Invalid user inputs
- [ ] Network timeouts
- [ ] API quota limits
- [ ] Large conversation histories
- [ ] Special characters in messages

### **Performance**
- [ ] Response times under 5 seconds
- [ ] No memory leaks
- [ ] Efficient database queries
- [ ] Proper error handling

## 📝 Notes

- **Node Version:** Project requires Node 22, but works with Node 23
- **Firebase CLI:** Must be installed globally (`npm install -g firebase-tools`)
- **Project ID:** Always use `YOUR_PROJECT_ID` (not `my-first-project-9e0be`)
- **CORS:** Already configured in backend - no additional setup needed
- **Environment Variables:** Using fallback values from config.ts files
- **Google Maps API:** Required for professional help feature - enable Places API, Maps JavaScript API, Geocoding API
- **Professional Help:** New feature with location-based mental health center discovery

## 🔄 Sharing & Collaboration

### **What Happens When Someone Downloads Your Code:**

**✅ Your App Stays Unchanged:**
- Your deployed app (`YOUR_PROJECT_ID.web.app`) remains exactly the same
- Your Firebase project, database, and functions are completely untouched
- Your users and data remain secure and isolated

**🆕 They Get Their Own App:**
- They need to create their own Firebase project
- They get their own domain (e.g., `my-manoday-app.web.app`)
- They have their own database and functions
- Complete isolation - no shared data or resources

### **Steps for Someone to Deploy Your Code:**

1. **Clone/Download** your code
2. **Create Firebase Project** with their own credentials
3. **Update Configuration Files:**
   ```typescript
   // frontend/src/firebase/config.ts
   const firebaseConfig = {
     projectId: 'THEIR_PROJECT_ID', // Not YOUR_PROJECT_ID
     // ... other config
   };
   
   // backend/functions/src/config.ts
   export const config = {
     gemini: {
       apiKey: 'THEIR_GEMINI_API_KEY', // Not your key
       // ... other config
     },
     googleMaps: {
       apiKey: 'THEIR_GOOGLE_MAPS_API_KEY', // Not your key
       // ... other config
     }
   };
   ```

4. **Update API URLs in Chatbot.tsx:**
   ```typescript
   // Change ALL fetch URLs from production to local emulators:
   // From: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/
// To: http://localhost:5001/YOUR_PROJECT_ID/us-central1/
   
   // This affects 4 API calls with EXACT line numbers:
   
   // Line 102: getEncryptedInsights
   const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/getEncryptedInsights`, {
   
   // Line 143: storeEncryptedInsights  
   const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/storeEncryptedInsights`, {
   
   // Line 197: gemini
   const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/gemini`, {
   
   // Line 271: automl
   const response = await fetch(`http://localhost:5001/YOUR_PROJECT_ID/us-central1/automl`, {
   ```
4. **Deploy to Their Project:**
   ```bash
   # Deploy backend
   cd backend/functions
   npm run build
   firebase deploy --only functions
   
   # Deploy frontend
   cd ../../frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

### **Result: Two Completely Separate Apps**
```
Your App: YOUR_PROJECT_ID.web.app
├── Your Firebase project
├── Your database & users
├── Your functions & API keys
└── Your domain

Their App: their-project.web.app
├── Their Firebase project  
├── Their database & users
├── Their functions & API keys
└── Their domain
```

**🔒 Security:** Complete isolation - no shared data, no cross-contamination

---

**🎯 Result:** A fully functional mental wellness app with Gemini AI integration and professional help locator, running locally without CORS issues or TypeScript errors.

## 🏥 Professional Help Feature

### **What It Does:**
- **Location-Based Search**: Finds mental health centers near user's location
- **Real Contact Information**: Displays actual phone numbers and websites
- **Google Maps Integration**: Powered by Google Places API
- **24/7 Availability**: Shows crisis centers and emergency helplines
- **Specialty Filtering**: Mental health, crisis intervention, therapy

### **How It Works:**
1. User clicks "Try Professional Help" button in chat
2. App requests location permission
3. Backend calls Google Places API to find nearby centers
4. Real contact information is fetched and displayed
5. User can call or visit website directly

### **Required Setup:**
- **Google Maps API Key**: Enable Places API, Maps JavaScript API, Geocoding API
- **Location Permission**: Browser geolocation access
- **CORS Configuration**: Already handled in backend

## 🎤 Speech-to-Text Feature

### **What It Does:**
- **Voice-to-Text Journaling**: Speak your thoughts and convert to text
- **Google Speech-to-Text API**: Powered by Google Cloud Speech-to-Text
- **Real-time Transcription**: Live speech recognition in the journal
- **Encrypted Storage**: Voice transcripts stored securely with journal entries

### **Required Setup:**
- **Google Speech-to-Text Service Account**: JSON key file with Speech-to-Text permissions
- **Service Account Key File**: Must be placed in backend functions directory

### **Service Account Key Setup:**

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

### **API Endpoints:**
- **Speech-to-Text**: `POST /speechToText?action=transcribe`
- **Supported Languages**: `GET /speechToText?action=languages`
- **Health Check**: `GET /speechToText?action=health`

### **Professional Help API Endpoints:**
- **Nearby Search**: `POST /professionalHelp?action=nearby`
- **City Search**: `POST /professionalHelp?action=city`
- **National Helplines**: `GET /professionalHelp?action=national`
- **Health Check**: `GET /professionalHelp?action=health`
