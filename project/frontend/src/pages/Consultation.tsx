import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { apiClient, API_ENDPOINTS, getApiErrorMessage } from '../config/api';
import { MessageSquare, Upload, Phone, AlertCircle, CheckCircle, Send, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface Message {
  id: string;
  consultation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  file_url: string | null;
  created_at: string;
}

const Consultation: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

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
          const userData = { id: currentUser.uid, ...userDoc.data() };
          setUser(userData);
        } else {
          navigate('/profile-setup');
        }
      } catch (err: any) {
        setError('Failed to load profile: ' + err.message);
      } finally {
        setIsUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  useEffect(() => {
    if (user && user.id) {
      const consultationsQuery = query(
        collection(db, 'consultations'),
        where(user.role === 'doctor' ? 'doctor_id' : 'patient_id', '==', user.id)
      );
      const unsubscribe = onSnapshot(consultationsQuery, (snapshot) => {
        const consultationData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
        setConsultations(consultationData);
      }, (err) => {
        setError('Failed to fetch consultations: ' + err.message);
      });
      return () => unsubscribe();
    }
  }, [user, db]);

  useEffect(() => {
    if (selectedConsultation) {
      const messagesQuery = query(collection(db, 'messages'), where('consultation_id', '==', selectedConsultation.id));
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messageData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(messageData);
      }, (err) => {
        setError('Failed to fetch messages: ' + err.message);
      });
      return () => unsubscribe();
    }
  }, [selectedConsultation, db]);

  const handleSendMessage = async () => {
    if (!selectedConsultation || !newMessage.trim()) return;
    try {
      await apiClient.post(API_ENDPOINTS.SEND_MESSAGE, {
        consultation_id: selectedConsultation.id,
        sender_id: user.id,
        receiver_id: user.role === 'doctor' ? selectedConsultation.patient_id : selectedConsultation.doctor_id,
        content: newMessage,
        type: 'text'
      });
      setNewMessage('');
      setNotification('Message sent successfully!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setError('Failed to send message: ' + getApiErrorMessage(err));
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex items-center space-x-3 text-slate-700">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="font-medium">Loading consultations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar userRole={user?.role || 'patient'} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} className="text-sm text-slate-500 hover:text-blue-600 flex items-center mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Hub</h1>
        </div>

        {notification && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center text-sm">
            <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" /> {notification}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center text-sm">
            <AlertCircle className="h-5 w-5 mr-2 text-rose-600" /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Your Consultations</h3>
          {consultations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No consultation records found.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConsultation(c)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                    selectedConsultation?.id === c.id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {user.role === 'doctor' ? 'Patient Consultation' : 'Doctor Consultation'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">ID: {c.id}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                    c.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedConsultation && selectedConsultation.status === 'accepted' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Direct Message Channel</h3>
            <div className="bg-slate-50 rounded-xl p-4 h-64 overflow-y-auto mb-4 border border-slate-200 space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs max-w-sm ${
                    msg.sender_id === user.id
                      ? 'bg-blue-600 text-white ml-auto'
                      : 'bg-white text-slate-800 border border-slate-200 mr-auto'
                  }`}
                >
                  <p className="font-semibold mb-0.5">{msg.sender_id === user.id ? 'You' : 'Provider'}</p>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center"
              >
                <Send className="w-4 h-4 mr-1.5" /> Send
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Consultation;