import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import XrayAnalysis from './pages/XrayAnalysis';
import FindDoctor from './pages/FindDoctor';
import ConsultationRequests from './pages/ConsultationRequest';
import DoctorChats from './pages/DoctorChats';
import Chat from './pages/Chat';
import PatientChats from './pages/PatientChats';
import VoiceCall from './pages/VoiceCall';
import ForgotPassword from './pages/ForgotPassword';
import ProfileSetup from './ProfileSetup';
import ChatbotWidget from './components/ChatBotWidget';

// Error Boundary for ChatBotWidget
class ChatbotErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently hide widget on error
    }
    return this.props.children;
  }
}

// Global Application Error Boundary
interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060B18] text-slate-100 flex items-center justify-center p-6 text-center">
          <div className="rounded-3xl border border-cyan-500/20 p-8 max-w-md w-full shadow-2xl bg-[#0A1226]/90 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Display Notice</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              An unexpected render issue occurred. You can return home or reload.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-lg"
              >
                Return Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-[#142347] border border-cyan-500/25 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppLayout: React.FC = () => {
  const location = useLocation();
  const showChatbot = !location.pathname.match(/^\/chat\/[^/]+$/);

  console.log('AppLayout: location.pathname =', location.pathname, 'showChatbot =', showChatbot);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        <Route path="/xray" element={<XrayAnalysis />} />
        <Route path="/find-doctor" element={<FindDoctor />} />
        <Route path="/consultation-requests" element={<ConsultationRequests />} />
        <Route path="/doctor-chats" element={<DoctorChats />} />
        <Route path="/patient-chats" element={<PatientChats />} />
        <Route path="/chat/:consultationId" element={<Chat />} />
        <Route path="/voice-call/:consultationId" element={<VoiceCall />} />
      </Routes>
      {showChatbot && (
        <ChatbotErrorBoundary>
          <ChatbotWidget />
        </ChatbotErrorBoundary>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppErrorBoundary>
        <AppLayout />
      </AppErrorBoundary>
    </Router>
  );
};

export default App;
