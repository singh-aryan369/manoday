import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import Chatbot from './components/Chatbot';
import ProfessionalHelpPage from './components/ProfessionalHelpPage';
import JournalPage from './components/JournalPage';
import DashboardPage from './components/DashboardPage';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <div className="App">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chatbot />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/professionalHelp" 
                  element={
                    <ProtectedRoute>
                      <ProfessionalHelpPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/journal" 
                  element={
                    <ProtectedRoute>
                      <JournalPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
