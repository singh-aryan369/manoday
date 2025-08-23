# Manoday - Mental Wellness App (Separated Structure)

A secure, empathetic mental wellness application with OAuth2 authentication and anonymous guest mode, built with React.js frontend and Firebase backend.

## 🏗️ **Project Structure**

```
manoday-app/
├── frontend/                 # React.js Frontend Application
│   ├── src/                 # React source code
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── firebase/        # Firebase configuration
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # App entry point
│   ├── public/              # Static files
│   ├── package.json         # Frontend dependencies
│   └── build/               # Production build (generated)
├── backend/                  # Firebase Backend
│   ├── functions/           # Cloud Functions
│   ├── firestore.rules      # Database security rules
│   └── firestore.indexes.json # Database indexes
├── firebase.json            # Firebase configuration
├── package.json             # Root package (manages both)
└── README-SEPARATED.md      # This file
```

## 🚀 **Quick Start**

### **Option 1: Automated Setup**
```bash
./setup-separated.sh
```

### **Option 2: Manual Setup**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
npm run frontend:install

# Install backend dependencies
npm run backend:install
```

## 🔧 **Available Commands**

### **Frontend Commands**
```bash
npm run frontend:start    # Start React development server (localhost:3000)
npm run frontend:build    # Build React app for production
npm run frontend:serve    # Serve built React app (localhost:3000)
```

### **Backend Commands**
```bash
npm run backend:start     # Start Firebase emulators
npm run backend:build     # Build backend functions
```

### **Combined Commands**
```bash
npm run dev               # Start both frontend and backend simultaneously
npm run install:all       # Install all dependencies
```

### **Deployment Commands**
```bash
npm run deploy            # Deploy everything to Firebase
npm run deploy:hosting    # Deploy only frontend
npm run deploy:functions  # Deploy only backend functions
npm run deploy:firestore  # Deploy only database rules
```

## 🎯 **Development Workflow**

### **Frontend Development**
```bash
# Start frontend development
npm run frontend:start

# Make changes to frontend/src/
# Changes will auto-reload in browser
```

### **Backend Development**
```bash
# Start backend emulators
npm run backend:start

# Make changes to backend/functions/
# Functions will auto-reload
```

### **Full Stack Development**
```bash
# Start both frontend and backend
npm run dev

# Frontend: localhost:3000
# Backend: localhost:5001 (Firebase emulator)
```

## 🔒 **Security Features**

### **Authentication**
- ✅ **OAuth2 Authentication** (Google, GitHub, Microsoft)
- ✅ **Anonymous Guest Mode** (No personal info required)
- ✅ **Secure Session Management**
- ✅ **Privacy-First Design**

### **Database Security**
- ✅ **Firestore Security Rules** (User-specific access)
- ✅ **Encrypted Communications**
- ✅ **Anonymous Chat Storage**
- ✅ **No Personal Data Collection**

## 📱 **Features**

### **User Experience**
- 🎨 **Beautiful, Modern UI** with Tailwind CSS
- 📱 **Mobile Responsive** design
- 🔄 **Real-time Chat** interface
- 💙 **Empathetic AI Responses**
- 🔒 **Privacy-Focused** messaging

### **Technical Features**
- ⚡ **Fast Performance** with optimized builds
- 🔧 **TypeScript** for type safety
- 🎯 **Component-Based** architecture
- 🚀 **Hot Reload** development
- 📦 **Modular Structure** for easy maintenance

## 🛠️ **Modifying the App**

### **Frontend Changes**
```bash
# Navigate to frontend directory
cd frontend

# Make changes to React components
# Edit files in frontend/src/

# Test changes
npm start

# Build for production
npm run build
```

### **Backend Changes**
```bash
# Navigate to backend directory
cd backend

# Make changes to Cloud Functions
# Edit files in backend/functions/src/

# Test with emulators
npm run serve

# Deploy changes
npm run deploy
```

### **Database Changes**
```bash
# Edit security rules
# Modify backend/firestore.rules

# Edit database indexes
# Modify backend/firestore.indexes.json

# Deploy database changes
npm run deploy:firestore
```

## 🔥 **Firebase Configuration**

### **Required Setup**
1. **Enable Authentication Providers:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Google, GitHub, Microsoft, and Anonymous

2. **Update Firebase Config:**
   - Edit `frontend/src/firebase/config.ts`
   - Add your Firebase project credentials

3. **Deploy Security Rules:**
   ```bash
   npm run deploy:firestore
   ```

## 🚀 **Deployment**

### **Full Deployment**
```bash
npm run deploy
```

### **Selective Deployment**
```bash
# Deploy only frontend
npm run deploy:hosting

# Deploy only backend functions
npm run deploy:functions

# Deploy only database rules
npm run deploy:firestore
```

## 🎉 **Benefits of Separated Structure**

### **✅ Independence**
- Modify frontend without affecting backend
- Update backend without touching frontend
- Independent versioning and deployment

### **✅ Scalability**
- Add new frontend frameworks easily
- Scale backend services independently
- Separate team development

### **✅ Maintenance**
- Clear separation of concerns
- Easier debugging and testing
- Independent dependency management

### **✅ Flexibility**
- Replace frontend entirely (React → Vue, Angular, etc.)
- Switch backend services (Firebase → AWS, GCP, etc.)
- Add new features without conflicts

## 🆘 **Troubleshooting**

### **Frontend Issues**
```bash
# Clear frontend cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Rebuild frontend
npm run build
```

### **Backend Issues**
```bash
# Clear backend cache
cd backend/functions
rm -rf node_modules package-lock.json
npm install

# Restart emulators
npm run serve
```

### **Firebase Issues**
```bash
# Clear Firebase cache
firebase logout
firebase login
firebase use --clear
firebase use your-project-id
```

## 📞 **Support**

For issues or questions:
1. Check Firebase Console for authentication setup
2. Verify all dependencies are installed
3. Check browser console for frontend errors
4. Check Firebase emulator logs for backend errors

---

**🎉 Your frontend and backend are now completely separated! You can modify either without affecting the other!**
