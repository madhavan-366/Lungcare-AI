import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle, User, Stethoscope, ArrowRight } from 'lucide-react';
import Navbar from './components/Navbar';

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setError('Please log in to set up your profile');
        navigate('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          navigate(userData.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
        } else {
          setUser({ id: currentUser.uid, email: currentUser.email });
        }
      } catch (err) {
        setError('Failed to check profile: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.id), {
        name: name.trim(),
        email: user.email,
        role,
        created_at: new Date().toISOString()
      });
      setNotification('Profile created successfully! Redirecting to dashboard...');
      setTimeout(() => navigate(role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'), 1000);
    } catch (err) {
      setError('Failed to create profile: ' + (err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 text-slate-200 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent" />
          <span className="text-sm font-medium">Loading user profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole={role} />

      <main className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col justify-center w-full">
        <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-8 bg-navy-900/90">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-glow-cyan mx-auto mb-3">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                {role === 'doctor' ? <Stethoscope className="w-7 h-7" /> : <User className="w-7 h-7" />}
              </div>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Complete Your Profile</h1>
            <p className="text-xs text-slate-300 mt-1">Please provide your details to personalize your healthcare portal</p>
          </div>

          {notification && (
            <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-200 flex items-start text-sm shadow-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{notification}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-sm shadow-sm">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full p-3 rounded-xl bg-navy-950/80 text-white border border-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center space-x-2 transition ${
                    role === 'patient'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-navy-950/60 border-cyan-500/20 text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center space-x-2 transition ${
                    role === 'doctor'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-navy-950/60 border-cyan-500/20 text-slate-400 hover:text-white'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-cyan-400" />
                  <span>Doctor</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow-cyan transition flex items-center justify-center space-x-2 mt-4"
            >
              <span>Save & Continue to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfileSetup;
