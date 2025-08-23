#!/bin/bash

echo "🚀 Setting up Manoday App - Separated Frontend & Backend"
echo "========================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
npm run frontend:install

echo "📦 Installing backend dependencies..."
npm run backend:install

echo "✅ All dependencies installed successfully!"

echo ""
echo "🎯 Project Structure:"
echo "├── frontend/          # React.js application"
echo "│   ├── src/           # React source code"
echo "│   ├── public/        # Static files"
echo "│   └── package.json   # Frontend dependencies"
echo "├── backend/           # Firebase backend"
echo "│   ├── functions/     # Cloud Functions"
echo "│   ├── firestore.rules # Database security rules"
echo "│   └── firestore.indexes.json # Database indexes"
echo "└── firebase.json      # Firebase configuration"
echo ""

echo "🔧 Available Commands:"
echo "  npm run frontend:start    # Start React development server"
echo "  npm run frontend:build    # Build React app for production"
echo "  npm run frontend:serve    # Serve built React app"
echo "  npm run backend:start     # Start Firebase emulators"
echo "  npm run dev               # Start both frontend and backend"
echo "  npm run deploy            # Deploy everything to Firebase"
echo "  npm run deploy:hosting    # Deploy only frontend"
echo "  npm run deploy:functions  # Deploy only backend functions"
echo ""

echo "📚 Next Steps:"
echo "1. Configure Firebase in frontend/src/firebase/config.ts"
echo "2. Enable Authentication providers in Firebase Console"
echo "3. Run 'npm run frontend:start' to start development"
echo "4. Run 'npm run dev' to start both frontend and backend"
echo ""

echo "🎉 Setup complete! Your frontend and backend are now separated!"
echo "You can now modify either without affecting the other!"
