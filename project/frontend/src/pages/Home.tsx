import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Activity,
  Stethoscope,
  Shield,
  Users,
  Award,
  Star,
  ChevronRight,
  MessageSquare,
  PhoneCall,
  Video,
  FileSearch,
  Scan,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
  HeartPulse,
  Mail,
  Phone,
  Clock,
  Compass,
  Cpu
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { HeroChestXrayVisual, FeatureScannerVisual, DoctorTeamVisual } from '../components/MedicalVisuals';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; role?: 'patient' | 'doctor'; name?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({ id: currentUser.uid, role: data.role, name: data.name });
          } else {
            setUser({ id: currentUser.uid });
          }
        } catch (e) {
          console.warn('User profile fetch note:', e);
          setUser({ id: currentUser.uid });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleXrayClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/xray');
    }
  };

  const handleDashboardClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 2. Polished Navigation Bar */}
      <Navbar userRole={user?.role} />

      <main className="flex-1">
        {/* 3. Hero Section */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-radial-glow border-b border-cyan-500/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide shadow-glow-cyan">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                  <span>AI-Powered Healthcare</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                  Advanced <span className="text-gradient-cyan">AI Healthcare</span> Solutions
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  AI-assisted chest X-ray analysis, doctor consultations, secure communication, and connected healthcare in one platform.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <button
                    onClick={handleXrayClick}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-royal-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-glow-cyan transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 group"
                  >
                    <FileSearch className="h-4 w-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                    <span>Start X-Ray Diagnostics</span>
                  </button>

                  <button
                    onClick={() => scrollToSection('services')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-navy-850/80 hover:bg-navy-800 text-slate-200 hover:text-white border border-cyan-500/25 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <Compass className="h-4 w-4 text-cyan-400" />
                    <span>Explore Healthcare Services</span>
                  </button>
                </div>

                {/* Trust Note */}
                <div className="pt-4 border-t border-cyan-500/15 max-w-xl mx-auto lg:mx-0">
                  <div className="flex items-start space-x-2.5 text-xs text-slate-400">
                    <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-300 font-semibold">Medical Evaluation Notice:</strong> AI diagnostic findings are intended as decision support tools and do not substitute for formal clinical assessment by a licensed physician or board-certified radiologist.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: High Quality Medical Visual */}
              <div className="lg:col-span-6">
                <HeroChestXrayVisual />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Comprehensive Healthcare Services Section */}
        <section id="services" className="py-20 md:py-28 bg-navy-900 border-b border-cyan-500/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Connected Medical Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Comprehensive Healthcare Services
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Connected tools designed to support patients and healthcare professionals.
              </p>
            </div>

            {/* 6 Responsive Service Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: AI X-Ray Analysis */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform shadow-glow-cyan">
                    <Scan className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    AI X-Ray Analysis
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Upload chest radiographs for deep learning analysis using the DenseNet-121 model. Generates multiclass pathology scores and localized Grad-CAM activation heatmaps.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <button
                    onClick={handleXrayClick}
                    className="inline-flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider group/btn"
                  >
                    <span>Explore X-Ray Analysis</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Card 2: Doctor Consultations */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-5 group-hover:scale-105 transition-transform">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Doctor Consultations
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Explore our registered directory of verified pulmonologists and physicians. Submit consultation requests, review clinical status, and obtain professional second opinions.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <button
                    onClick={() => navigate('/find-doctor')}
                    className="inline-flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider group/btn"
                  >
                    <span>Find a Doctor</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Card 3: Real-Time Chat */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-royal-600/20 border border-royal-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Real-Time Chat
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Communicate securely with your consulting physician in real time. Exchange direct messages, discuss diagnostic findings, and securely transmit medical files and report PDFs.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <button
                    onClick={() => navigate(user?.role === 'doctor' ? '/doctor-chats' : '/patient-chats')}
                    className="inline-flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider group/btn"
                  >
                    <span>Open Messages</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Card 4: Voice Calls */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                    <PhoneCall className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Voice Calls
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Initiate telephone connections directly through verified clinical phone numbers on record. Seamlessly triggers your device’s native dialer to reach your attending doctor.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <div className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Native telephone link integration</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Video Consultations (Truthful: Under Active Clinical Development) */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                    <Video className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Telehealth Consultations
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Direct physician communication is currently powered by real-time encrypted messaging and telephone linkage. Live WebRTC video visit streaming is planned for future releases.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-500/30">
                    Active via Chat & Phone
                  </span>
                </div>
              </div>

              {/* Card 6: Privacy and Security */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-300 mb-5 group-hover:scale-105 transition-transform">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Privacy and Security
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Protected by Firebase Authentication cryptographic JSON Web Tokens, granular Firestore role-based access controls, and TLS 1.3 encrypted transport for clinical imaging.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-cyan-500/15">
                  <div className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>Cryptographic token verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. AI X-Ray Diagnostics Feature Section */}
        <section id="technology" className="py-20 md:py-28 bg-navy-950 border-b border-cyan-500/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left Side: X-ray scanner visual */}
              <div className="lg:col-span-6">
                <FeatureScannerVisual />
              </div>

              {/* Right Side: Feature details */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Deep Learning Radiology</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Intelligent Chest X-Ray Analysis
                </h2>

                <p className="text-slate-300 text-base leading-relaxed">
                  Our diagnostic workflow ingests high-resolution chest radiographs, normalizes pixel intensities, and processes tensors through a pretrained <strong>DenseNet-121</strong> convolutional neural network to generate multi-label thoracic pathology scores.
                </p>

                {/* 4 Feature Highlights */}
                <div className="space-y-3.5">
                  {[
                    {
                      title: 'AI-Assisted Image Analysis',
                      desc: 'Standardized radiograph tensor normalization and multi-label classifier inference.'
                    },
                    {
                      title: 'Multiple Supported Chest Pathology Scores',
                      desc: 'Probability scoring for conditions including Pneumonia, Pneumothorax, Infiltration, Effusion, and Atelectasis.'
                    },
                    {
                      title: 'Visual Heatmap Support',
                      desc: 'Grad-CAM activation overlays pinpointing specific anatomical regions driving the model’s predictions.'
                    },
                    {
                      title: 'Diagnosis History',
                      desc: 'Secure Firestore logging enables longitudinal review and instant PDF report generation for every scan.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-3.5 glass-panel p-3.5 rounded-xl border border-cyan-500/15">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={handleXrayClick}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-glow-cyan transition active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Try X-Ray Diagnostics</span>
                  </button>

                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Instant inference upon upload</span>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    <strong className="text-amber-100 font-semibold">Diagnostic Disclaimer:</strong> Model scores are research prototypes designed for informational and preliminary screening support only. They do not constitute a definitive medical diagnosis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Healthcare Team Section */}
        <section id="about" className="py-20 md:py-28 bg-navy-900 border-b border-cyan-500/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Collaborative Healthcare
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Technology Supporting Better Healthcare
                </h2>
                <p className="text-slate-300 text-base leading-relaxed">
                  LungCare AI is designed to augment medical practitioners rather than replace clinical judgment. By streamlining radiograph screening, clinicians can review cases more efficiently, prioritize urgent pathology signs, and maintain continuous patient dialogues.
                </p>

                {/* 3 Benefit Cards */}
                <div className="grid sm:grid-cols-3 gap-4 pt-2">
                  <div className="glass-card-static rounded-xl p-4 border border-cyan-500/15">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center mb-3">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">Patient-Centered Care</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">Direct access to diagnostic history and clinician chats.</p>
                  </div>

                  <div className="glass-card-static rounded-xl p-4 border border-cyan-500/15">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">Connected Consultations</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">Frictionless discovery and second-opinion requests.</p>
                  </div>

                  <div className="glass-card-static rounded-xl p-4 border border-cyan-500/15">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mb-3">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">AI-Assisted Analysis</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">Pretrained DenseNet-121 feature activation mapping.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <DoctorTeamVisual />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Call-to-Action Banner */}
        <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-r from-blue-700 via-royal-600 to-cyan-600 text-white shadow-2xl">
          <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Take the Next Step in Your Healthcare Journey
            </h2>
            <p className="text-cyan-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Access AI-assisted X-ray analysis and connect with healthcare professionals through LungCare AI.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <button
                onClick={handleXrayClick}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-sm shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2"
              >
                <FileSearch className="w-4 h-4 text-blue-600" />
                <span>Start X-Ray Analysis</span>
              </button>

              <button
                onClick={() => navigate('/find-doctor')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-navy-950/80 hover:bg-navy-900 text-white border border-cyan-300/40 font-bold text-sm shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2"
              >
                <Stethoscope className="w-4 h-4 text-cyan-300" />
                <span>Find a Doctor</span>
              </button>
            </div>
          </div>
        </section>

        {/* 8. Contact and Support Section */}
        <section id="contact" className="py-20 bg-navy-950 border-b border-cyan-500/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Support & Emergency Guidance
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Support & Contact Resources
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Connect with our platform team, locate clinical specialists, or access essential emergency safety guidance.
              </p>
            </div>

            {/* 3 Contact Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Emergency Support Card */}
              <div className="glass-card-static rounded-2xl p-6 sm:p-7 border border-rose-500/30 bg-rose-950/20 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Emergency Support</h3>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                    LungCare AI is <strong>not an emergency service</strong>. If you or someone you know is experiencing acute respiratory distress, severe chest trauma, or any life-threatening symptoms, immediately contact emergency services.
                  </p>
                </div>
                <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-500/40 text-center">
                  <span className="text-xs text-rose-300 font-mono block">Emergency Hotline</span>
                  <span className="text-lg font-black text-rose-200 tracking-wider">Dial 911 / Local Emergency</span>
                </div>
              </div>

              {/* Email Support Card */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Platform Support</h3>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                    Have questions regarding account authentication, X-ray uploads, or physician registration? Our developer and support team are available to assist.
                  </p>
                </div>
                <div>
                  <a
                    href="mailto:contact@lungcare.ai"
                    className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-navy-850 hover:bg-navy-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    <span>Email Support Desk</span>
                  </a>
                </div>
              </div>

              {/* Healthcare Services Card */}
              <div className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 flex items-center justify-center mb-4">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Healthcare Services</h3>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                    Looking to connect with an attending physician, send a second-opinion request, or check message history? Access the doctor directory directly.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => navigate('/find-doctor')}
                    className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-glow-cyan transition"
                  >
                    <Stethoscope className="w-4 h-4 mr-2" />
                    <span>Find a Pulmonologist</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Multi-Column Footer */}
      <footer className="bg-navy-950 border-t border-cyan-500/15 py-14 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-glow-cyan">
                  <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
                    <Activity className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">LungCare AI</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Modern medical diagnostic intelligence and secure telehealth collaboration platform designed for thoracic healthcare support.
              </p>
            </div>

            {/* Column 2: Services */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Services</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button onClick={handleXrayClick} className="hover:text-cyan-400 transition">
                    X-Ray Analysis
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/find-doctor')} className="hover:text-cyan-400 transition">
                    Find a Doctor
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate(user?.role === 'doctor' ? '/consultation-requests' : '/find-doctor')}
                    className="hover:text-cyan-400 transition"
                  >
                    Consultations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate(user?.role === 'doctor' ? '/doctor-chats' : '/patient-chats')}
                    className="hover:text-cyan-400 transition"
                  >
                    Clinical Chat
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button onClick={() => scrollToSection('about')} className="hover:text-cyan-400 transition">
                    About LungCare
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('technology')} className="hover:text-cyan-400 transition">
                    DenseNet-121 Architecture
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('contact')} className="hover:text-cyan-400 transition">
                    Contact & Emergency
                  </button>
                </li>
                <li>
                  <button onClick={handleDashboardClick} className="hover:text-cyan-400 transition">
                    User Portal Dashboard
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal & Safety */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Legal & Safety</h4>
              <div className="space-y-2.5 text-xs text-slate-400">
                <p className="leading-relaxed">
                  <strong className="text-slate-300">Medical Notice:</strong> Diagnostic outputs are intended for clinical support and preliminary screening. Review all results with a qualified physician.
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-300">Security:</strong> Role-based access control and encrypted data transport protect patient confidentiality.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-cyan-500/10 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <p>© 2026 LungCare AI. All rights reserved. | Connected Thoracic Medicine Platform</p>
            <p className="text-slate-400">Non-emergency clinical decision support software.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
