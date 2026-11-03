import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDoc,
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import {
  AlertCircle,
  Send,
  MessageSquare,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: any;
  read?: boolean;
  read_at?: any;
  hasPendingWrites?: boolean;
  status?: 'sending' | 'sent' | 'error';
  isFailed?: boolean;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  patient_name?: string;
  doctor_name?: string;
  patient_phone?: string;
  doctor_phone?: string;
}

const parseTimestamp = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatMessageTime = (val: any): string => {
  const date = parseTimestamp(val);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

const Chat: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userRole, setUserRole] = useState<'doctor' | 'patient' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markedAsReadIdsRef = useRef<Set<string>>(new Set());

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;
    markedAsReadIdsRef.current.clear();

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || !consultationId) {
        navigate('/login');
        return;
      }

      try {
        const consultationDoc = await getDoc(doc(db, 'consultations', consultationId));
        if (!consultationDoc.exists()) {
          setError('Consultation channel not found.');
          setLoading(false);
          return;
        }

        const data = consultationDoc.data() as Consultation;

        // Security check: Verify authenticated user is a participant
        if (data.doctor_id !== currentUser.uid && data.patient_id !== currentUser.uid) {
          setError('Access restricted: You are not authorized to view this consultation.');
          setLoading(false);
          return;
        }

        const role = data.doctor_id === currentUser.uid ? 'doctor' : 'patient';
        setUserRole(role);

        // Fetch user profiles with individual try-catch blocks
        let patientName = 'Patient';
        let doctorName = 'Doctor';
        let patientPhone: string | undefined;
        let doctorPhone: string | undefined;

        try {
          const patientDoc = await getDoc(doc(db, 'users', data.patient_id));
          if (patientDoc.exists()) {
            const pData = patientDoc.data();
            patientName = pData.name || 'Patient';
            patientPhone = pData.phone_number;
          }
        } catch (pErr) {
          console.warn('Notice: Could not load patient profile details:', pErr);
        }

        try {
          const doctorDoc = await getDoc(doc(db, 'users', data.doctor_id));
          if (doctorDoc.exists()) {
            const dData = doctorDoc.data();
            doctorName = dData.name || 'Doctor';
            doctorPhone = dData.phone_number;
          }
        } catch (dErr) {
          console.warn('Notice: Could not load doctor profile details:', dErr);
        }

        const resolvedConsultation: Consultation = {
          ...data,
          id: consultationId,
          patient_name: patientName,
          doctor_name: doctorName,
          patient_phone: patientPhone,
          doctor_phone: doctorPhone,
        };

        setConsultation(resolvedConsultation);

        // Real-time listener: Query by consultation_id without composite orderBy
        const q = query(
          collection(db, 'messages'),
          where('consultation_id', '==', consultationId)
        );

        unsubscribeMessages = onSnapshot(
          q,
          { includeMetadataChanges: true },
          (snapshot) => {
            const msgs = snapshot.docs.map((d) => {
              const msgData = d.data();
              const hasPendingWrites = d.metadata.hasPendingWrites;
              return {
                id: d.id,
                ...msgData,
                hasPendingWrites,
                status: hasPendingWrites ? 'sending' : 'sent',
              };
            }) as Message[];

            // Sort chronologically in memory
            msgs.sort((a, b) => {
              const timeA = parseTimestamp(a.timestamp).getTime();
              const timeB = parseTimestamp(b.timestamp).getTime();
              if (timeA !== timeB) return timeA - timeB;
              return a.id.localeCompare(b.id);
            });

            setMessages(msgs);
            setLoading(false);

            // WhatsApp-style read receipt: Mark incoming unread messages as read
            const currentUserId = currentUser.uid;
            const unreadDocsToMark = snapshot.docs.filter((d) => {
              const dData = d.data();
              return (
                dData.sender_id !== currentUserId &&
                !dData.read &&
                !d.metadata.hasPendingWrites &&
                !markedAsReadIdsRef.current.has(d.id)
              );
            });

            if (unreadDocsToMark.length > 0) {
              unreadDocsToMark.forEach((d) => markedAsReadIdsRef.current.add(d.id));

              const batch = writeBatch(db);
              unreadDocsToMark.forEach((d) => {
                batch.update(doc(db, 'messages', d.id), {
                  read: true,
                  read_at: serverTimestamp(),
                });
              });

              batch.commit().catch((batchErr) => {
                console.warn('Notice: Failed to update message read receipts:', batchErr);
                unreadDocsToMark.forEach((d) => markedAsReadIdsRef.current.delete(d.id));
              });
            }
          },
          (err) => {
            console.error('Messages real-time snapshot notice:', err);
            setError('Failed to sync messages: ' + (err.message || 'Permission or connection issue.'));
            setLoading(false);
          }
        );
      } catch (err: any) {
        setError('Error accessing consultation: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMessages) unsubscribeMessages();
      markedAsReadIdsRef.current.clear();
    };
  }, [consultationId, navigate, auth, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (isSending || !consultation || !auth.currentUser || !newMessage.trim()) return;

    const messageText = newMessage.trim();

    // Immediately clear input for responsive UX
    setNewMessage('');
    setError(null);
    setIsSending(true);

    const myName =
      userRole === 'doctor'
        ? `Dr. ${consultation.doctor_name?.replace(/^Dr\.\s*/i, '') || 'Specialist'}`
        : consultation.patient_name || 'Patient';

    try {
      await addDoc(collection(db, 'messages'), {
        consultation_id: consultationId,
        sender_id: auth.currentUser.uid,
        sender_name: myName,
        content: messageText,
        timestamp: serverTimestamp(),
        read: false,
        read_at: null,
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to save message to Firestore:', err);
      setError('Message could not be delivered: ' + (err.message || 'Please check connection and retry.'));
      // Restore input text so user does not lose their typed message
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Connecting to secure consultation channel...</span>
        </div>
      </div>
    );
  }

  const partnerName =
    userRole === 'doctor'
      ? consultation?.patient_name || 'Patient'
      : `Dr. ${consultation?.doctor_name?.replace(/^Dr\.\s*/i, '') || 'Doctor'}`;
  const backLink = userRole === 'doctor' ? '/doctor-chats' : '/patient-chats';

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole={userRole || 'patient'} />

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Chat Header Card */}
        <div className="glass-panel rounded-t-3xl border border-cyan-500/20 border-b-0 p-4 sm:p-5 bg-navy-900/90 shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <Link
              to={backLink}
              className="p-2 hover:bg-navy-850 rounded-xl text-slate-400 hover:text-white transition"
              title="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan flex-shrink-0">
              <div className="w-full h-full bg-navy-950 rounded-[12px] flex items-center justify-center text-cyan-400 font-bold text-base">
                {partnerName ? partnerName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{partnerName}</h2>
              <p className="text-[11px] text-cyan-300 font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 inline-block animate-pulse" />
                Active Consultation Session
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              Encrypted
            </span>
          </div>
        </div>

        {/* Message Log Container */}
        <div className="flex-1 bg-navy-950/80 border-x border-cyan-500/20 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-[440px] max-h-[62vh] shadow-inner">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-300 hover:text-white text-xs underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-14 h-14 glass-panel rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-3 text-cyan-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-white">No messages exchanged yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Send a clinical message below to begin your consultation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === auth.currentUser?.uid;
              const isPending = !!msg.hasPendingWrites;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1 font-mono">
                    {isMe ? 'You' : msg.sender_name}
                  </span>
                  <div
                    className={`max-w-md p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm shadow-glow-cyan'
                        : 'glass-panel text-slate-100 rounded-tl-sm border border-cyan-500/25 bg-navy-900/90'
                    }`}
                  >
                    {/* Text content */}
                    {msg.content ? (
                      <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <p className="italic text-slate-400 text-xs">[Attachment no longer supported]</p>
                    )}

                    {/* Delivery Status & Timestamp */}
                    <div
                      className={`text-[10px] mt-2 text-right font-mono flex items-center justify-end space-x-1.5 ${
                        isMe ? 'text-cyan-100/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatMessageTime(msg.timestamp)}</span>

                      {/* WhatsApp-style Sent and Read receipts (shown for sender's messages) */}
                      {isMe && (
                        <>
                          {isPending ? (
                            <span
                              className="inline-flex items-center text-cyan-200/70 gap-0.5"
                              title="Sending to server..."
                            >
                              <Clock className="w-3 h-3 animate-pulse inline" />
                              <span className="text-[9px]">Sending</span>
                            </span>
                          ) : msg.read ? (
                            <span
                              className="inline-flex items-center text-cyan-300"
                              title="Read by recipient"
                            >
                              <CheckCheck className="w-3.5 h-3.5 inline text-cyan-300" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-slate-300/80"
                              title="Sent to server"
                            >
                              <Check className="w-3.5 h-3.5 inline text-slate-300/80" />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Bar */}
        <div className="glass-panel rounded-b-3xl border border-cyan-500/20 p-3 sm:p-4 shadow-2xl bg-navy-900/90 flex items-center space-x-2.5">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your clinical message..."
            disabled={isSending}
            className="flex-1 px-4 py-2.5 bg-navy-950/80 border border-cyan-500/25 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-500 shadow-inner disabled:opacity-60"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={isSending || !newMessage.trim()}
            className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl transition shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center min-w-[42px] flex-shrink-0"
            title="Send message"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
