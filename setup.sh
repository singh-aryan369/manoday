#!/bin/bash

echo "🚀 Setting up Manoday - Secure Mental Wellness App"
echo "=================================================="

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

echo "📦 Installing project dependencies..."
npm install

echo "✅ Dependencies installed successfully!"

echo ""
echo "🔧 Next Steps:"
echo "1. Copy env.example to .env and update with your Firebase credentials"
echo "2. Configure OAuth providers in Firebase Console"
echo "3. Update src/firebase/config.ts with your Firebase project details"
echo "4. Run 'npm start' to start the development server"
echo ""
echo "📚 For detailed setup instructions, see README.md"
echo ""
echo "🎉 Setup complete! Happy coding!"
