import React, { useState, Component, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, Activity, Shield, Lock, Send } from 'lucide-react';

class ErrorBoundary extends Component<{ children: React.ReactNode; onRetry: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary in ForgotPassword:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8 glass-panel rounded-2xl border border-cyan-500/20 max-w-md mx-auto my-12 text-slate-100">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong.</h1>
          <button
            onClick={this.props.onRetry}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFriendlyErrorMessage = (errorCode: string, defaultMessage: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account was found with this email address. Please check the spelling or create an account.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/missing-email':
        return 'Please enter your email address.';
      case 'auth/too-many-requests':
        return 'Too many password reset requests. Please wait a few minutes before trying again.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection and try again.';
      default:
        return defaultMessage || 'Failed to send password reset email. Please try again.';
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotification(null);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setNotification('Password reset instructions have been sent to your email. Please check your inbox and spam folder.');
      setEmail('');
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr?.code || '';
      const message = firebaseErr?.message || '';
      setError(getFriendlyErrorMessage(code, message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 bg-radial-glow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-10 max-w-md w-full relative z-10 bg-navy-900/90 backdrop-blur-xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group focus:outline-none mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan mx-auto">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center group-hover:bg-opacity-80 transition">
                <Activity className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Enter your account email to receive reset instructions
          </p>
        </div>

        {notification && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-200 flex items-start text-sm shadow-sm animate-in fade-in duration-200">
            <CheckCircle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="font-medium leading-relaxed">{notification}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-sm shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5 text-rose-400" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-royal-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow-cyan transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                <span>Sending Reset Link...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-cyan-500/15 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Return to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const ForgotPassword: React.FC = () => {
  return (
    <ErrorBoundary onRetry={() => window.location.reload()}>
      <ForgotPasswordForm />
    </ErrorBoundary>
  );
};

export default ForgotPassword;
