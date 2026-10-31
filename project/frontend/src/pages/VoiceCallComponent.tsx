import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const VoiceCallComponent = ({ consultationId: propConsultationId, onCallEnd }: { consultationId?: string; onCallEnd?: () => void }) => {
  const { consultationId } = useParams<{ consultationId?: string }>();
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const initiateCall = async () => {
      const cid = propConsultationId || consultationId;
      if (!cid || !auth.currentUser) {
        navigate('/consultation-requests');
        return;
      }

      try {
        const consultationDoc = await getDoc(doc(db, 'consultations', cid));
        if (consultationDoc.exists()) {
          const data = consultationDoc.data();
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid === data.doctor_id ? data.patient_id : data.doctor_id));
          const recipientPhone = userDoc.exists() ? userDoc.data().phone_number : undefined;
          if (recipientPhone) {
            window.location.href = `tel:${recipientPhone}`;
          } else {
            navigate('/consultation-requests');
          }
        } else {
          navigate('/consultation-requests');
        }
      } catch (err) {
        console.error('Call initiation error:', err);
        navigate('/consultation-requests');
      }
    };

    initiateCall();

    return () => {
      if (onCallEnd) onCallEnd();
    };
  }, [consultationId, propConsultationId, navigate, auth, onCallEnd]);

  return null; // No UI needed, as the call is handled by the browser
};

export default VoiceCallComponent;