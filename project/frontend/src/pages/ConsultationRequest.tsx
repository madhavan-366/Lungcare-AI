import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, where, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle,
  User,
  UserCheck,
  UserX,
  MessageSquare,
  Phone,
  RefreshCw,
  ArrowLeft,
  Clock,
  Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface Patient {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  phone_number?: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  specialty?: string;
  phone_number?: string;
}

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: any;
  updated_at?: any;
}

interface ConsultationWithPatient extends Consultation {
  patient: Patient | null;
}

const parseDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const ConsultationRequest: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<Doctor | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [consultations, setConsultations] = useState<ConsultationWithPatient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [isProcessing, setIsProcessing] = useState<{ [consultationId: string]: boolean }>({});

  const auth = getAuth();
  const db = getFirestore();

  const fetchPatientData = async (patientId: string): Promise<Patient> => {
    try {
      const patientDoc = await getDoc(doc(db, 'users', patientId));
      if (patientDoc.exists()) {
        const data = patientDoc.data();
        return {
          id: patientId,
          name: data.name || 'Patient',
          email: data.email || 'N/A',
          role: data.role || 'patient',
          phone_number: data.phone_number,
        };
      }
      return {
        id: patientId,
        name: 'Patient (Unregistered)',
        email: 'N/A',
        role: 'patient',
      };
    } catch {
      return {
        id: patientId,
        name: 'Patient',
        email: 'N/A',
        role: 'patient',
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsUserLoading(true);
      if (!currentUser) {
        navigate('/login');
        setIsUserLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = { id: currentUser.uid, ...userDoc.data() } as Doctor;
          if (userData.role !== 'doctor') {
            navigate('/patient-dashboard');
          } else {
            setUser(userData);
          }
        } else {
          navigate('/profile-setup');
        }
      } catch (err: any) {
        setError('Failed to load doctor profile: ' + err.message);
      } finally {
        setIsUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  useEffect(() => {
    if (user && user.id) {
      setIsLoadingConsultations(true);
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('doctor_id', '==', user.id)
      );

      const unsubscribe = onSnapshot(consultationsQuery, async (snapshot) => {
        try {
          const consultationsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Consultation[];

          const withPatients = await Promise.all(
            consultationsData.map(async (c) => {
              const patient = await fetchPatientData(c.patient_id);
              return { ...c, patient };
            })
          );

          setConsultations(withPatients);
        } catch (err: any) {
          setError('Failed to process consultation requests: ' + err.message);
        } finally {
          setIsLoadingConsultations(false);
        }
      }, (err) => {
        setError('Failed to fetch requests: ' + err.message);
        setIsLoadingConsultations(false);
      });

      return () => unsubscribe();
    }
  }, [user, db]);

  const handleConsultationRequest = async (consultationId: string, action: 'accepted' | 'rejected') => {
    if (!user) return;
    setIsProcessing((prev) => ({ ...prev, [consultationId]: true }));
    setError(null);

    try {
      const consultationRef = doc(db, 'consultations', consultationId);
      await updateDoc(consultationRef, {
        status: action,
        updated_at: new Date(),
      });

      if (action === 'accepted') {
        const item = consultations.find(c => c.id === consultationId);
        await addDoc(collection(db, 'messages'), {
          consultation_id: consultationId,
          sender_id: user.id,
          sender_name: user.name,
          content: `Hello ${item?.patient?.name || 'there'}, Dr. ${user.name} has accepted your consultation request. How can I help you today?`,
          timestamp: new Date(),
        });
        setNotification('Consultation accepted! Direct communication channel opened.');
        setTimeout(() => navigate('/doctor-chats'), 1200);
      } else {
        setNotification('Consultation request was declined.');
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setError(`Failed to update request: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [consultationId]: false }));
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="doctor" />

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
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
                <span>Physician Triage</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Clock className="w-7 h-7 text-cyan-400" />
                <span>Patient Consultation Requests</span>
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Review and approve appointments requested by patients across your clinical practice.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications & Error Alerts */}
        {notification && (
          <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-200 flex items-center shadow-sm animate-in fade-in duration-200">
            <CheckCircle className="h-5 w-5 mr-3 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-200 flex items-center shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 mr-3 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoadingConsultations && (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Loading pending appointments...</p>
          </div>
        )}

        {/* Consultations List */}
        {!isLoadingConsultations && consultations.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-cyan-500/20 p-12 text-center shadow-2xl bg-navy-900/90">
            <div className="w-14 h-14 bg-navy-850 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-cyan-500/20">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Pending Requests</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
              You do not currently have any pending consultation requests from patients.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => {
              const isBusy = isProcessing[consultation.id];
              return (
                <div
                  key={consultation.id}
                  className="glass-card rounded-2xl border border-cyan-500/20 bg-navy-900/80 shadow-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400 font-black text-lg flex-shrink-0 shadow-glow-cyan">
                      {consultation.patient?.name ? consultation.patient.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="text-base font-bold text-white">
                          {consultation.patient?.name || 'Patient'}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                            consultation.status === 'accepted'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : consultation.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {consultation.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Email: <span className="text-cyan-300">{consultation.patient?.email}</span>
                        {consultation.patient?.phone_number && (
                          <span className="ml-3">
                            Phone: <span className="text-emerald-300">{consultation.patient.phone_number}</span>
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Requested: {parseDate(consultation.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end md:self-center">
                    {consultation.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleConsultationRequest(consultation.id, 'accepted')}
                          disabled={isBusy}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-glow-cyan flex items-center active:scale-95 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4 mr-1.5" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          onClick={() => handleConsultationRequest(consultation.id, 'rejected')}
                          disabled={isBusy}
                          className="px-4 py-2.5 bg-navy-850 hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition flex items-center disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4 mr-1.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : consultation.status === 'accepted' ? (
                      <button
                        onClick={() => navigate('/doctor-chats')}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-glow-cyan flex items-center"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        <span>Open Chat</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsultationRequest;
