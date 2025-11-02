import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import Chatbot from './components/Chatbot';
import ProfessionalHelpPage from './components/ProfessionalHelpPage';
import JournalPage from './components/JournalPage';
import DashboardPage from './components/DashboardPage';
import InsightsPage from './components/InsightsPage';
import TopBar from './components/TopBar';
import GoalTracker from './components/GoalTracker';
import PersonalAssistantPage from './components/PersonalAssistantPage';
import MeditationYogaPage from './pages/MeditationYogaPage';
import HobbiesSurveyPage from './pages/HobbiesSurveyPage';
import HobbiesRecommendationsPage from './pages/HobbiesRecommendationsPage';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleNewChat = () => navigate('/chat?new=1');
  const handleToggleInsights = () => navigate('/insights');

  return (
    <div>
      <TopBar onNewChat={handleNewChat} onToggleInsights={handleToggleInsights} />
      <div className="pt-6">
        <Outlet />
      </div>
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <div className="App">
              <Routes>
                {/* Public route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected area with persistent TopBar as parent at '/' */}
                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  {/* Default child when user enters protected area */}
                  <Route index element={<DashboardPage />} />

                  {/* Child routes are relative to the protected parent */}
                  <Route path="chat" element={<Chatbot />} />
                  <Route path="insights" element={<InsightsPage />} />
                  <Route path="professionalHelp" element={<ProfessionalHelpPage />} />
                  <Route path="journal" element={<JournalPage />} />
                  <Route path="goal-tracker" element={<GoalTracker />} />
                  <Route path="assistant" element={<PersonalAssistantPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="meditation-yoga" element={<MeditationYogaPage />} />
                  <Route path="hobbies/survey" element={<HobbiesSurveyPage />} />
                  <Route path="hobbies/recommendations" element={<HobbiesRecommendationsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
