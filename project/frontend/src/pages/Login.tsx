import React, { useState, Component, ErrorInfo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, AlertCircle, CheckCircle, Activity, Shield, Lock, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

class ErrorBoundary extends Component<{ children: React.ReactNode; onRetry: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary in Login:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8 glass-panel rounded-2xl border border-cyan-500/20 max-w-md mx-auto my-12 text-slate-100">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong.</h1>
          <p className="text-slate-300 text-sm mb-4">An error occurred while rendering the login screen.</p>
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

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<'reset' | 'signup' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFriendlyErrorMessage = (errorCode: string, defaultMessage: string): { message: string; action: 'reset' | 'signup' | null } => {
    switch (errorCode) {
      case 'auth/invalid-login-credentials':
      case 'auth/invalid-credential':
        return {
          message: 'Invalid email or password. Please verify your credentials or reset your password.',
          action: 'reset',
        };
      case 'auth/user-not-found':
        return {
          message: 'No account was found with this email address. Please sign up for a new account.',
          action: 'signup',
        };
      case 'auth/wrong-password':
        return {
          message: 'Incorrect password. Please try again or reset your password.',
          action: 'reset',
        };
      case 'auth/invalid-email':
        return {
          message: 'Please enter a valid email address.',
          action: null,
        };
      case 'auth/user-disabled':
        return {
          message: 'This user account has been disabled. Please contact LungCare support.',
          action: null,
        };
      case 'auth/too-many-requests':
        return {
          message: 'Too many unsuccessful login attempts. Access is temporarily disabled. Please reset your password or try again later.',
          action: 'reset',
        };
      case 'auth/network-request-failed':
        return {
          message: 'Network connection failed. Please check your internet connection and try again.',
          action: null,
        };
      default:
        return {
          message: defaultMessage || 'Failed to log in. Please check your credentials and try again.',
          action: null,
        };
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Please fill in both email and password');
      setErrorAction(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setErrorAction(null);
    setNotification(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);

      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setNotification('Login successful! Redirecting to dashboard...');
          setTimeout(() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'), 800);
        } else {
          setNotification('Login successful! Redirecting to profile setup...');
          setTimeout(() => navigate('/profile-setup'), 800);
        }
      } catch (firestoreErr: unknown) {
        console.warn('Firestore profile lookup note:', firestoreErr);
        setNotification('Login successful! Redirecting...');
        setTimeout(() => navigate('/profile-setup'), 800);
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const firebaseErr = err as { code?: string; message?: string };
      const code = firebaseErr?.code || '';
      const message = firebaseErr?.message || '';
      const friendly = getFriendlyErrorMessage(code, message);
      setError(friendly.message);
      setErrorAction(friendly.action);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 bg-radial-glow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Decorative Blur Background Circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-10 max-w-md w-full relative z-10 bg-navy-900/90 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group focus:outline-none mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan mx-auto">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center group-hover:bg-opacity-80 transition">
                <Activity className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sign In to <span className="text-gradient-cyan">LungCare AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Access your medical diagnostics and consultations
          </p>

          <div className="flex items-center justify-center space-x-4 mt-4 pt-4 border-t border-cyan-500/15 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
              <span>Role-Based Access</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Encrypted Authentication</span>
            </div>
          </div>
        </div>

        {/* Notifications & Error alerts */}
        {notification && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-200 flex items-start text-sm shadow-sm animate-in fade-in duration-200">
            <CheckCircle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="font-medium">{notification}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-sm shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-2">
                <p className="font-medium leading-relaxed">{error}</p>
                {errorAction === 'reset' && (
                  <div>
                    <Link
                      to="/forgot-password"
                      className="inline-flex items-center text-cyan-300 hover:text-white font-semibold underline text-xs"
                    >
                      Reset your password <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                )}
                {errorAction === 'signup' && (
                  <div>
                    <Link
                      to="/signup"
                      className="inline-flex items-center text-cyan-300 hover:text-white font-semibold underline text-xs"
                    >
                      Create an account <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
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

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 pr-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-0.5 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-xs text-slate-400 pt-1">
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-cyan-500/30 bg-navy-950 text-cyan-500 focus:ring-cyan-400 w-4 h-4"
              />
              <span className="ml-2">Remember this device</span>
            </label>
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-cyan-500/15 text-center text-xs text-slate-400">
          <span>Don't have an account yet? </span>
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-bold transition">
            Create Free Account
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  return (
    <ErrorBoundary onRetry={() => window.location.reload()}>
      <LoginForm />
    </ErrorBoundary>
  );
};

export default Login;
