import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  AlertCircle,
  Stethoscope,
  MessageSquare,
  Scan,
  Users,
  Activity,
  Calendar,
  FileText,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  specialization?: string;
  Specialization?: string;
}

const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsUserLoading(true);
      if (!currentUser) {
        setError('Please log in to access the doctor dashboard');
        navigate('/login');
        setIsUserLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = { id: currentUser.uid, ...userDoc.data() } as User;
          if (userData.role !== 'doctor') {
            setError('Access restricted to doctors only');
            navigate('/login');
          } else {
            setUser(userData);
          }
        } else {
          setError('Doctor profile not found. Please complete your profile.');
          navigate('/profile-setup');
        }
      } catch (err) {
        setError('Failed to load doctor profile: ' + (err as Error).message);
        navigate('/login');
      } finally {
        setIsUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading physician portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl border border-rose-500/30 max-w-md w-full text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-rose-400 mb-3" />
          <p className="text-sm text-slate-200">Please log in with a doctor account to access the physician portal.</p>
        </div>
      </div>
    );
  }

  const spec = user.specialization || user.Specialization || 'Pulmonology Specialist';

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="doctor" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
        {/* Physician Header Banner */}
        <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-8 mb-8 bg-navy-900/90 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan flex-shrink-0">
                <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                  <Stethoscope className="w-8 h-8" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, Dr. {user.name}
                  </h1>
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-slate-300 text-sm mt-0.5">
                  {spec} • Clinical Physician Portal
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3.5 py-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Clinical Status: Available</span>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 flex items-center shadow-sm">
            <AlertCircle className="h-5 w-5 mr-3 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Primary Management Actions */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Clinical Workflow & Services</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate('/consultation-requests')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 text-left group flex flex-col justify-between active:scale-[0.99] transition shadow-lg"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-blue-600 group-hover:text-white transition shadow-glow-cyan">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  Consultation Requests
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Review and accept incoming patient appointment requests, triage clinical histories, and manage consultation requests.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center text-cyan-400 text-xs font-semibold">
                <span>View Requests</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/doctor-chats')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 text-left group flex flex-col justify-between active:scale-[0.99] transition shadow-lg"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-4 group-hover:bg-cyan-600 group-hover:text-white transition">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  Active Patient Chats
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Direct communication channels with accepted patients, review attached records, and provide diagnostic recommendations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center text-cyan-400 text-xs font-semibold">
                <span>Open Messages</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/xray')}
              className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 text-left group flex flex-col justify-between active:scale-[0.99] transition shadow-lg"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-royal-500/20 border border-royal-400/30 flex items-center justify-center text-blue-400 mb-4 group-hover:bg-royal-600 group-hover:text-white transition">
                  <Scan className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition">
                  AI X-Ray Diagnostics
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Upload patient radiographs for DenseNet-121 multiclass thoracic pathology analysis and Grad-CAM visual activation heatmaps.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center text-cyan-400 text-xs font-semibold">
                <span>Launch Diagnostics</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Practice Indicators */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Practice Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/15 bg-navy-900/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Patients</h4>
              <p className="text-slate-400 text-xs">Active and pending patient consultations</p>
            </div>

            <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/15 bg-navy-900/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Radiology</h4>
              <p className="text-slate-400 text-xs">AI chest radiograph analysis history</p>
            </div>

            <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/15 bg-navy-900/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Schedule</h4>
              <p className="text-slate-400 text-xs">Clinical second opinions and chats</p>
            </div>

            <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/15 bg-navy-900/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Diagnostic Reports</h4>
              <p className="text-slate-400 text-xs">Generated clinical PDF summaries</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
