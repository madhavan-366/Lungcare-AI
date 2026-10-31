import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle,
  Stethoscope,
  MessageSquare,
  FileImage,
  Activity,
  Calendar,
  ArrowRight,
  Shield,
  HeartPulse,
  Sparkles,
  FileSearch,
  Lock
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  phone_number?: string;
}

const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [stats, setStats] = useState({ consultations: 0, messages: 0, xrays: 0 });

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (!currentUser) {
        navigate('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'patient') {
            setUser({ id: currentUser.uid, ...userData } as User);

            // Fetch live counts
            try {
              const [consSnap, xraySnap] = await Promise.all([
                getDocs(query(collection(db, 'consultations'), where('patient_id', '==', currentUser.uid))),
                getDocs(query(collection(db, 'xray_diagnoses'), where('user_id', '==', currentUser.uid)))
              ]);
              setStats({
                consultations: consSnap.size,
                messages: consSnap.size,
                xrays: xraySnap.size
              });
            } catch (err) {
              console.warn('Count fetch fallback:', err);
            }
          } else if (userData.role === 'doctor') {
            navigate('/doctor-dashboard');
            return;
          } else {
            navigate('/profile-setup');
            return;
          }
        } else {
          navigate('/profile-setup');
          return;
        }
      } catch (err: any) {
        setError('Failed to load patient profile: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading patient portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
        <Navbar userRole="patient" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-slate-300 text-sm mb-6">Please log in with a registered patient account.</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-400 transition shadow-glow-cyan"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="patient" />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        {/* Header Greeting */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Patient Care Portal</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user.name}
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Access your diagnostic screenings, connect with respiratory specialists, and review consultations.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/xray"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-sm font-semibold transition shadow-glow-cyan flex items-center active:scale-95"
              >
                <FileSearch className="w-4 h-4 mr-2" />
                <span>New X-Ray Analysis</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Notifications & Error alerts */}
        {notification && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-200 flex items-center shadow-sm">
            <CheckCircle className="h-5 w-5 mr-3 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 flex items-center shadow-sm">
            <AlertCircle className="h-5 w-5 mr-3 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="glass-card-static rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center text-cyan-400 shadow-glow-cyan">
              <FileImage className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">X-Ray Scans</p>
              <h3 className="text-3xl font-black text-white mt-0.5">{stats.xrays}</h3>
              <p className="text-[11px] text-cyan-300/80">Diagnoses on record</p>
            </div>
          </div>

          <div className="glass-card-static rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center text-emerald-400">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Consultations</p>
              <h3 className="text-3xl font-black text-white mt-0.5">{stats.consultations}</h3>
              <p className="text-[11px] text-emerald-300/80">Doctor consultations</p>
            </div>
          </div>

          <div className="glass-card-static rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 flex items-center space-x-4">
            <div className="w-14 h-14 bg-purple-500/20 border border-purple-400/30 rounded-2xl flex items-center justify-center text-purple-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Chats</p>
              <h3 className="text-3xl font-black text-white mt-0.5">{stats.messages}</h3>
              <p className="text-[11px] text-purple-300/80">Clinical conversations</p>
            </div>
          </div>
        </div>

        {/* Primary Healthcare Action Cards */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Healthcare Services</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Find Doctor */}
            <div
              onClick={() => navigate('/find-doctor')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
            >
              <div>
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  Find a Pulmonologist
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Browse verified respiratory specialists, inspect medical credentials, and request direct second opinions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Browse Specialists</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>

            {/* Card 2: AI Diagnostics */}
            <div
              onClick={() => navigate('/xray')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
            >
              <div>
                <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-400/30 rounded-xl flex items-center justify-center text-cyan-300 mb-4 group-hover:bg-cyan-600 group-hover:text-white transition">
                  <FileImage className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  AI X-Ray Diagnostics
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Upload your chest radiographs for instant DenseNet-121 multiclass screening and Grad-CAM localized heatmaps.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Analyze Scan</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>

            {/* Card 3: Patient Chats */}
            <div
              onClick={() => navigate('/patient-chats')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
            >
              <div>
                <div className="w-12 h-12 bg-royal-500/20 border border-royal-400/30 rounded-xl flex items-center justify-center text-blue-400 mb-4 group-hover:bg-royal-600 group-hover:text-white transition">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  Doctor Messages
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Direct encrypted messaging with attending doctors to discuss symptoms, reports, and diagnostic follow-ups.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Open Messages</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Card */}
        <div className="glass-panel rounded-2xl border border-cyan-500/20 p-6 bg-navy-900/90 shadow-xl">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-400/30 rounded-xl flex items-center justify-center text-cyan-300 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Health Data Confidentiality & Protection</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Patient radiographic scans, diagnostic inferences, and consultation dialogues are isolated under role-based security rules in Firestore with Firebase cryptographic token validation. Only physicians whom you consult have permission to access your records.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
