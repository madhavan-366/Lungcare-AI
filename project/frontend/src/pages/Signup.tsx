import React, { useState, Component, ErrorInfo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Phone, Mail, AlertCircle, CheckCircle, Stethoscope, Activity, Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

class ErrorBoundary extends Component<{ children: React.ReactNode; onRetry: () => void }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary in Signup:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8 glass-panel rounded-2xl border border-cyan-500/20 max-w-md mx-auto my-12 text-slate-100">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong.</h1>
          <p className="text-slate-300 text-sm mb-4">An error occurred while rendering the signup screen.</p>
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

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [specialization, setSpecialization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<'login' | 'reset' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFriendlyErrorMessage = (errorCode: string, defaultMessage: string): { message: string; action: 'login' | 'reset' | null } => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return {
          message: 'An account with this email address already exists. Please sign in or reset your password.',
          action: 'login',
        };
      case 'auth/invalid-email':
        return {
          message: 'Please enter a valid email address.',
          action: null,
        };
      case 'auth/weak-password':
        return {
          message: 'Password is too weak. Please use at least 6 characters.',
          action: null,
        };
      case 'auth/operation-not-allowed':
        return {
          message: 'Email/Password sign-up is not enabled in Firebase Authentication.',
          action: null,
        };
      case 'auth/network-request-failed':
        return {
          message: 'Network connection failed. Please check your internet connection and try again.',
          action: null,
        };
      case 'auth/too-many-requests':
        return {
          message: 'Too many requests. Please wait a moment before trying again.',
          action: null,
        };
      default:
        return {
          message: defaultMessage || 'Failed to create account. Please check your details and try again.',
          action: null,
        };
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanName || !cleanEmail || !password || !cleanPhone || (role === 'doctor' && !specialization.trim())) {
      setError('Please fill in all required fields');
      setErrorAction(null);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setErrorAction(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setErrorAction(null);
    setNotification(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      const userData: any = {
        name: cleanName,
        email: cleanEmail,
        role: role,
        phone_number: cleanPhone,
        created_at: new Date().toISOString(),
      };

      if (role === 'doctor') {
        userData.Specialization = specialization.trim();
      }

      await setDoc(doc(db, 'users', user.uid), userData);

      setNotification('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate(role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
      }, 1000);
    } catch (err: unknown) {
      console.error('Signup error:', err);
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
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-10 max-w-lg w-full relative z-10 bg-navy-900/90 backdrop-blur-xl my-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group focus:outline-none mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan mx-auto">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center group-hover:bg-opacity-80 transition">
                <Activity className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Create <span className="text-gradient-cyan">LungCare</span> Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Join the connected thoracic diagnostic platform
          </p>
        </div>

        {/* Account Role Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Register As:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-sm font-semibold transition ${
                role === 'patient'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-glow-cyan'
                  : 'bg-navy-950/60 border-cyan-500/20 text-slate-400 hover:text-white hover:bg-navy-850'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>Patient</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-sm font-semibold transition ${
                role === 'doctor'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-glow-cyan'
                  : 'bg-navy-950/60 border-cyan-500/20 text-slate-400 hover:text-white hover:bg-navy-850'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              <span>Doctor</span>
            </button>
          </div>
        </div>

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
                {errorAction === 'login' && (
                  <div>
                    <Link
                      to="/login"
                      className="inline-flex items-center text-cyan-300 hover:text-white font-semibold underline text-xs"
                    >
                      Sign In instead <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type="text"
                placeholder={role === 'doctor' ? 'Dr. Sarah Connor' : 'Jane Doe'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type="email"
                placeholder="doctor@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number (For Consultation Calling)
            </label>
            <div className="relative">
              <Phone className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type="tel"
                placeholder="+1 (555) 234-5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
              />
            </div>
          </div>

          {role === 'doctor' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Clinical Specialization
              </label>
              <div className="relative">
                <Stethoscope className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Pulmonology, Thoracic Radiology, Critical Care"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full p-3 pl-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="absolute top-3.5 left-3.5 h-4 w-4 text-cyan-400/80 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 pr-10 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-sm placeholder:text-slate-500 transition shadow-inner"
                required
                minLength={6}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-royal-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow-cyan transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 mt-2 ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                <span>Registering Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-cyan-500/15 text-center text-xs text-slate-400">
          <span>Already registered with LungCare AI? </span>
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition">
            Sign In Here
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

const Signup: React.FC = () => {
  return (
    <ErrorBoundary onRetry={() => window.location.reload()}>
      <SignupForm />
    </ErrorBoundary>
  );
};

export default Signup;
