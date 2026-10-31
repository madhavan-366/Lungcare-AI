import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { AlertCircle, MessageSquare, Stethoscope, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
}

const PatientChats: React.FC = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<(Consultation & { doctor: Doctor })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    let unsubscribe: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const q = query(
        collection(db, 'consultations'),
        where('patient_id', '==', currentUser.uid),
        where('status', '==', 'accepted')
      );

      unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
          const consultationsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Consultation[];

          const consultationsWithDoctors = await Promise.all(
            consultationsData.map(async (consultation) => {
              const doctorDoc = await getDoc(doc(db, 'users', consultation.doctor_id));
              const doctor = doctorDoc.exists()
                ? {
                    id: doctorDoc.id,
                    name: doctorDoc.data().name || 'Specialist',
                    specialization: doctorDoc.data().Specialization || doctorDoc.data().specialization || 'Pulmonology Specialist',
                  }
                : { id: consultation.doctor_id, name: 'Doctor' };
              return { ...consultation, doctor };
            })
          );

          setConsultations(consultationsWithDoctors);
          setLoading(false);
        } catch (err: any) {
          setError('Failed to load doctor chats: ' + err.message);
          setLoading(false);
        }
      }, (err) => {
        setError('Failed to load chats: ' + err.message);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, [navigate, auth, db]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading consultations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="patient" />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        {/* Header Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <Link to="/patient-dashboard" className="hover:text-cyan-400 flex items-center transition">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Doctor Channels</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <MessageSquare className="w-7 h-7 text-cyan-400" />
                <span>Doctor Consultations</span>
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Direct encrypted conversations with your accepted physicians.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-200 flex items-center shadow-sm">
            <AlertCircle className="h-5 w-5 mr-3 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {consultations.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-cyan-500/20 p-12 text-center shadow-2xl bg-navy-900/90">
            <div className="w-14 h-14 bg-navy-850 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-cyan-500/20">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Active Consultations</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mb-6">
              You do not have any accepted doctor conversations yet. Browse our doctor directory to request a consultation.
            </p>
            <button
              onClick={() => navigate('/find-doctor')}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-glow-cyan"
            >
              Find a Pulmonologist
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {consultations.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/chat/${c.id}`)}
                className="glass-card rounded-2xl p-5 border border-cyan-500/20 bg-navy-900/80 flex items-center justify-between cursor-pointer group shadow-lg active:scale-[0.99] transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan flex-shrink-0">
                    <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center text-cyan-400 font-bold text-base">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                      Dr. {c.doctor.name}
                    </h3>
                    <p className="text-xs text-cyan-300/80 font-medium">
                      {c.doctor.specialization || 'Pulmonology Specialist'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
                  <span className="hidden sm:inline">Open Conversation</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientChats;
