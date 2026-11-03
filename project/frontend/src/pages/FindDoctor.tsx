import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, where, addDoc, doc, getDoc } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle,
  Stethoscope,
  RefreshCw,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Clock,
  Check,
  Search,
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface Doctor {
  id: string;
  name: string;
  email: string;
  Specialization?: string;
  specialization?: string;
  role: 'doctor';
  phone_number?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  phone_number?: string;
}

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'accepted' | 'rejected' | null;
}

const FindDoctor: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{ [doctorId: string]: 'pending' | 'accepted' | 'rejected' | null }>({});
  const [consultationIds, setConsultationIds] = useState<{ [doctorId: string]: string }>({});
  const [isRequesting, setIsRequesting] = useState<{ [doctorId: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const auth = getAuth();
  const db = getFirestore();

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
          const userData = { id: currentUser.uid, ...userDoc.data() } as UserProfile;
          if (userData.role !== 'patient') {
            navigate('/doctor-dashboard');
          } else {
            setUser(userData);
          }
        } else {
          navigate('/profile-setup');
        }
      } catch (err: any) {
        setError('Failed to load patient profile: ' + err.message);
      } finally {
        setIsUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  useEffect(() => {
    if (user && user.id) {
      setIsLoadingDoctors(true);
      setError(null);
      try {
        const doctorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'doctor')
        );
        const unsubscribe = onSnapshot(doctorsQuery, (snapshot) => {
          const doctorsData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Doctor[];
          setDoctors(doctorsData);
          setIsLoadingDoctors(false);
        }, (err) => {
          setError('Failed to fetch available doctors: ' + err.message);
          setIsLoadingDoctors(false);
        });
        return () => unsubscribe();
      } catch (err: any) {
        setError('Failed to fetch doctors: ' + err.message);
        setIsLoadingDoctors(false);
      }
    }
  }, [user, db]);

  useEffect(() => {
    if (user && user.id) {
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where('patient_id', '==', user.id)
      );
      const unsubscribe = onSnapshot(consultationsQuery, (snapshot) => {
        const newRequestStatus: { [doctorId: string]: 'pending' | 'accepted' | 'rejected' | null } = {};
        const newConsultationIds: { [doctorId: string]: string } = {};
        snapshot.docs.forEach((d) => {
          const consultation = d.data() as Consultation;
          newRequestStatus[consultation.doctor_id] = consultation.status;
          newConsultationIds[consultation.doctor_id] = d.id;
        });
        setRequestStatus(newRequestStatus);
        setConsultationIds(newConsultationIds);
      }, (err) => {
        console.error('Consultation Query Error:', err);
      });
      return () => unsubscribe();
    }
  }, [user, db]);

  const requestConsultation = async (doctorId: string) => {
    if (!user) {
      setError('Please sign in to request a consultation');
      return;
    }
    setIsRequesting((prev) => ({ ...prev, [doctorId]: true }));
    setError(null);
    try {
      await addDoc(collection(db, 'consultations'), {
        patient_id: user.id,
        doctor_id: doctorId,
        status: 'pending',
        created_at: new Date(),
      });
      setRequestStatus((prev) => ({ ...prev, [doctorId]: 'pending' }));
      setNotification('Consultation request submitted successfully!');
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setError('Failed to submit consultation request: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRequesting((prev) => ({ ...prev, [doctorId]: false }));
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const docSpec = doc.specialization || doc.Specialization || '';
    return (
      (doc.name && doc.name.toLowerCase().includes(term)) ||
      (docSpec && docSpec.toLowerCase().includes(term)) ||
      (doc.email && doc.email.toLowerCase().includes(term))
    );
  });

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading specialist directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole="patient" />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
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
                <span>Verified Physicians</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Stethoscope className="w-7 h-7 text-cyan-400" />
                <span>Find a Pulmonologist</span>
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Connect with board-certified respiratory and thoracic medicine physicians.
              </p>
            </div>
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-cyan-400/80 absolute top-3.5 left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by physician or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-navy-950/80 text-white border border-cyan-500/25 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 placeholder:text-slate-500 shadow-inner"
              />
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
        {isLoadingDoctors && (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Querying verified clinical directory...</p>
          </div>
        )}

        {/* Doctors Grid */}
        {!isLoadingDoctors && filteredDoctors.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-cyan-500/20 p-12 text-center shadow-2xl bg-navy-900/90">
            <div className="w-14 h-14 bg-navy-850 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-cyan-500/20">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Physicians Found</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
              {searchTerm ? 'No physicians matched your search criteria.' : 'No registered doctors are available in the directory currently.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => {
              const status = requestStatus[doc.id];
              const isReq = isRequesting[doc.id];
              const docSpec = doc.specialization || doc.Specialization || 'Pulmonology Specialist';

              return (
                <div
                  key={doc.id}
                  className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-navy-900/80 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Doctor Header */}
                    <div className="flex items-start space-x-3.5 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan flex-shrink-0">
                        <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                            Dr. {doc.name}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-cyan-300/80 font-medium">{docSpec}</p>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 text-xs text-slate-300 bg-navy-950/60 p-3 rounded-xl border border-cyan-500/10 mb-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{doc.email}</span>
                      </div>
                      {doc.phone_number && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{doc.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consultation Request Action */}
                  <div className="pt-3 border-t border-cyan-500/15">
                    {status === 'accepted' ? (
                      <button
                        onClick={() => navigate(consultationIds[doc.id] ? `/chat/${consultationIds[doc.id]}` : '/patient-chats')}
                        className="w-full py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Connected • Open Chat</span>
                      </button>
                    ) : status === 'pending' ? (
                      <div className="w-full py-2.5 px-4 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Consultation Pending</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => requestConsultation(doc.id)}
                        disabled={isReq}
                        className={`w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-glow-cyan flex items-center justify-center gap-1.5 active:scale-95 ${
                          isReq ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isReq ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1" />
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Request Consultation</span>
                          </>
                        )}
                      </button>
                    )}
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

export default FindDoctor;
