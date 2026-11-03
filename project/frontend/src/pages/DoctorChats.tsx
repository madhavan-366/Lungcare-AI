import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { AlertCircle, MessageSquare, User, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Patient {
  id: string;
  name: string;
  email?: string;
}

const DoctorChats: React.FC = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<(Consultation & { patient: Patient })[]>([]);
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
        where('doctor_id', '==', currentUser.uid),
        where('status', '==', 'accepted')
      );

      unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
          const consultationsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Consultation[];

          const consultationsWithPatients = await Promise.all(
            consultationsData.map(async (consultation) => {
              try {
                const patientDoc = await getDoc(doc(db, 'users', consultation.patient_id));
                const patient = patientDoc.exists()
                  ? {
                      id: patientDoc.id,
                      name: patientDoc.data().name || 'Patient',
                      email: patientDoc.data().email,
                    }
                  : { id: consultation.patient_id, name: 'Patient' };
                return { ...consultation, patient };
              } catch (pErr) {
                console.warn('Notice fetching patient profile:', pErr);
                return { ...consultation, patient: { id: consultation.patient_id, name: 'Patient' } };
              }
            })
          );

          setConsultations(consultationsWithPatients);
          setLoading(false);
        } catch (err: any) {
          setError('Failed to load conversations: ' + err.message);
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
          <span className="font-medium text-sm">Loading clinical conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="doctor" />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        {/* Header Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <Link to="/doctor-dashboard" className="hover:text-cyan-400 flex items-center transition">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Encrypted Consultations</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <MessageSquare className="w-7 h-7 text-cyan-400" />
                <span>Active Patient Chats</span>
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Direct clinical messaging channels with your accepted patients.
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
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Active Patient Chats</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
              Once you accept a consultation request from a patient, your direct chat channel will appear here.
            </p>
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
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400 font-bold text-base shadow-glow-cyan flex-shrink-0">
                    {c.patient.name ? c.patient.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                      {c.patient.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {c.patient.email || 'Registered Patient'}
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

export default DoctorChats;
