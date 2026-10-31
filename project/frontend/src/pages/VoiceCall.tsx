import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VoiceCallComponent from './VoiceCallComponent';

const VoiceCall: React.FC = () => {
  const { consultationId } = useParams<{ consultationId?: string }>();
  const navigate = useNavigate();

  const handleCallEnd = () => {
    navigate('/consultation-requests');
  };

  return <VoiceCallComponent consultationId={consultationId} onCallEnd={handleCallEnd} />;
};

export default VoiceCall;