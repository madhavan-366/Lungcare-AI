import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, addDoc, orderBy, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { AlertCircle, Send, Paperclip, MessageSquare, Download, Phone, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  file_url?: string;
  file_name?: string;
  timestamp: any;
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

const Chat: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'doctor' | 'patient' | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || !consultationId) {
        navigate('/login');
        return;
      }

      try {
        const consultationDoc = await getDoc(doc(db, 'consultations', consultationId));
        if (consultationDoc.exists()) {
          const data = consultationDoc.data() as Consultation;
          const [patientDoc, doctorDoc] = await Promise.all([
            getDoc(doc(db, 'users', data.patient_id)),
            getDoc(doc(db, 'users', data.doctor_id)),
          ]);

          const resolvedConsultation: Consultation = {
            ...data,
            id: consultationId,
            patient_name: patientDoc.exists() ? patientDoc.data().name : 'Patient',
            doctor_name: doctorDoc.exists() ? doctorDoc.data().name : 'Doctor',
            patient_phone: patientDoc.exists() ? patientDoc.data().phone_number : undefined,
            doctor_phone: doctorDoc.exists() ? doctorDoc.data().phone_number : undefined,
          };

          setConsultation(resolvedConsultation);
          const role = data.doctor_id === currentUser.uid ? 'doctor' : 'patient';
          setUserRole(role);

          // Listen for messages
          const q = query(
            collection(db, 'messages'),
            where('consultation_id', '==', consultationId),
            orderBy('timestamp', 'asc')
          );

          unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Message[];
            setMessages(msgs);
            setDataLoaded(true);
            setLoading(false);
          }, (err) => {
            console.error('Messages snapshot error:', err);
            setError('Failed to load message history.');
            setLoading(false);
          });
        } else {
          setError('Consultation channel not found.');
          setLoading(false);
        }
      } catch (err: any) {
        setError('Error accessing consultation: ' + err.message);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, [consultationId, navigate, auth, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDownload = (fileUrl: string, fileName: string | undefined) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'medical_attachment';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError('Failed to open file');
    }
  };

  const finalizeMessage = async (fileUrl?: string, fileName?: string) => {
    if (!consultation || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'messages'), {
        consultation_id: consultationId,
        sender_id: auth.currentUser.uid,
        sender_name: userRole === 'doctor' ? `Dr. ${consultation.doctor_name}` : consultation.patient_name || 'Patient',
        content: newMessage.trim(),
        file_url: fileUrl || null,
        file_name: fileName || null,
        timestamp: new Date(),
      });
      setNewMessage('');
      setFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      setError('Failed to send message: ' + err.message);
    }
  };

  const sendMessage = async () => {
    if (!dataLoaded || !consultation || !auth.currentUser) return;
    if (!newMessage.trim() && !file) return;

    if (file) {
      try {
        const metadata = { contentDisposition: `attachment; filename="${file.name}"` };
        const fileRef = ref(storage, `consultation_files/${consultationId}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file, metadata);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(pct);
          },
          () => {
            setError('File upload failed.');
            setUploadProgress(0);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await finalizeMessage(downloadUrl, file.name);
          }
        );
      } catch (err: any) {
        setError('Upload error: ' + err.message);
        setUploadProgress(0);
      }
    } else {
      await finalizeMessage();
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

  const partnerName = userRole === 'doctor' ? consultation?.patient_name : `Dr. ${consultation?.doctor_name}`;
  const partnerPhone = userRole === 'doctor' ? consultation?.patient_phone : consultation?.doctor_phone;
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
                {partnerName ? partnerName.replace('Dr. ', '').charAt(0).toUpperCase() : 'U'}
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
            {partnerPhone && (
              <a
                href={`tel:${partnerPhone}`}
                className="px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/25 transition flex items-center shadow-sm"
                title={`Call ${partnerPhone}`}
              >
                <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span>Voice Call</span>
              </a>
            )}
          </div>
        </div>

        {/* Message Log Container */}
        <div className="flex-1 bg-navy-950/80 border-x border-cyan-500/20 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-[440px] max-h-[62vh] shadow-inner">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-14 h-14 glass-panel rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-3 text-cyan-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-white">No messages exchanged yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Send a clinical message or attach radiographic documents below to begin your consultation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === auth.currentUser?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1 font-mono">
                    {msg.sender_name}
                  </span>
                  <div
                    className={`max-w-md p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm shadow-glow-cyan'
                        : 'glass-panel text-slate-100 rounded-tl-sm border border-cyan-500/25 bg-navy-900/90'
                    }`}
                  >
                    {msg.content && <p className="break-words">{msg.content}</p>}

                    {msg.file_url && (
                      <button
                        onClick={() => handleDownload(msg.file_url!, msg.file_name)}
                        className={`mt-2.5 flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                          isMe
                            ? 'bg-blue-700/60 border-cyan-300/40 text-cyan-100 hover:bg-blue-700'
                            : 'bg-navy-950/80 border-cyan-500/30 text-cyan-300 hover:bg-navy-850'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 flex-shrink-0 text-cyan-300" />
                        <span className="truncate max-w-[200px]">{msg.file_name || 'Medical Document'}</span>
                      </button>
                    )}

                    <div
                      className={`text-[10px] mt-1.5 text-right font-mono ${
                        isMe ? 'text-cyan-100/75' : 'text-slate-400'
                      }`}
                    >
                      {parseTimestamp(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload progress & File Preview */}
        {uploadProgress > 0 && (
          <div className="bg-navy-900 border-x border-cyan-500/20 px-4 py-2 border-t border-cyan-500/10">
            <div className="flex justify-between text-xs text-cyan-300 mb-1 font-mono">
              <span>Uploading medical attachment...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {file && !uploadProgress && (
          <div className="bg-navy-900/90 border-x border-cyan-500/20 px-4 py-2.5 text-xs flex items-center justify-between text-slate-200">
            <div className="flex items-center space-x-2 truncate">
              <Paperclip className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-rose-400 hover:text-rose-300 font-bold text-xs ml-2"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="glass-panel rounded-b-3xl border border-cyan-500/20 p-3 sm:p-4 shadow-2xl bg-navy-900/90 flex items-center space-x-2.5">
          <label
            className="p-2.5 text-slate-400 hover:text-cyan-300 hover:bg-navy-850 rounded-xl transition cursor-pointer"
            title="Attach file (PDF, PNG, JPG up to 5MB)"
          >
            <Paperclip className="w-5 h-5" />
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                  setError('File size exceeds the 5MB limit.');
                  return;
                }
                setFile(selectedFile || null);
              }}
              accept="image/png,image/jpeg,application/pdf"
            />
          </label>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your clinical message..."
            className="flex-1 px-4 py-2.5 bg-navy-950/80 border border-cyan-500/25 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-500 shadow-inner"
          />

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() && !file}
            className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl transition shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
