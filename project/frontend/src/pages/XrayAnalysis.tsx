import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Download,
  X,
  FileImage,
  RefreshCw,
  Activity,
  ArrowLeft,
  Scan,
  Shield,
  Layers,
  Sparkles,
  FileSearch,
  Eye,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import Navbar from '../components/Navbar';

interface DiagnosticResult {
  confidence: number;
  findings: string[];
  associated_symptoms?: string[];
  recommendation: string;
  severity: 'mild' | 'moderate' | 'severe';
  disease_probabilities: { [key: string]: number };
  symptom_predictions?: { [key: string]: number };
  gradcam_image: string;
  xray_id?: string;
  user_id?: string;
  image_url?: string;
  created_at?: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  phone_number?: string;
}

const parseDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  if (val instanceof Date) {
    return val;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const XrayAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [diagnoses, setDiagnoses] = useState<DiagnosticResult[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'severity'>('date');

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsUserLoading(true);
      if (!currentUser) {
        setError('Please sign in to access X-ray analysis');
        setIsUserLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUser({ id: currentUser.uid, ...userDoc.data() } as User);
        } else {
          setError('User profile not found. Redirecting to profile setup.');
          navigate('/profile-setup');
        }
      } catch (err) {
        setError('Failed to load user profile: ' + (err as Error).message);
      } finally {
        setIsUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, auth, db]);

  useEffect(() => {
    if (user && user.id) {
      const diagnosesQuery = query(collection(db, 'xray_diagnoses'), where('user_id', '==', user.id));
      const unsubscribe = onSnapshot(diagnosesQuery, (snapshot) => {
        const diagnosisData = snapshot.docs.map(doc => ({ xray_id: doc.id, ...doc.data() } as DiagnosticResult));
        setDiagnoses(diagnosisData.sort((a, b) => {
          if (sortBy === 'date') {
            return parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime();
          }
          return a.severity.localeCompare(b.severity);
        }));
      }, (err) => {
        console.error('Firestore Listener Error:', err);
        setError(`Failed to load previous diagnoses: ${err.message}`);
      });
      return () => unsubscribe();
    }
  }, [user, sortBy, db]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type) && file.size < 10 * 1024 * 1024) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setDiagnosticResult(null);
      setError(null);
    } else {
      setError('Please upload a valid PNG or JPG file under 10MB');
      setSelectedFile(null);
      setUploadedImage(undefined);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile || !user || !auth.currentUser) {
      setError('Please upload an image and ensure you are logged in.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress = (currentProgress + 10) % 95;
      setProgress(currentProgress);
    }, 400);

    const performRequest = async (forceRefresh = false) => {
      const idToken = await auth.currentUser!.getIdToken(forceRefresh);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', user.id);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      return await axios.post(`${backendUrl}/analyze-xray`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${idToken}`,
        },
      });
    };

    try {
      let response;
      try {
        response = await performRequest(false);
      } catch (firstErr: any) {
        if (firstErr.response?.status === 401) {
          response = await performRequest(true);
        } else {
          throw firstErr;
        }
      }
      setProgress(100);
      setDiagnosticResult(response.data);
      setNotification('Radiographic analysis completed successfully!');
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail || err.message || 'Unknown error occurred';
      if (err.response?.status === 401) {
        setError('Authentication failed: Your session may have expired. Please sign in again.');
      } else {
        setError(`Failed to analyze X-ray: ${errorDetail}`);
      }
    } finally {
      clearInterval(interval);
      setProgress(0);
      setIsAnalyzing(false);
    }
  };

  const retryAnalysis = () => {
    if (selectedFile && auth.currentUser) {
      analyzeImage();
    } else {
      setError('Cannot retry: Please ensure an image is selected and you are signed in.');
    }
  };

  const downloadGradCam = () => {
    if (diagnosticResult?.gradcam_image) {
      const link = document.createElement('a');
      link.href = diagnosticResult.gradcam_image;
      link.download = `gradcam_${Date.now()}.png`;
      link.click();
      setNotification('Grad-CAM visualization downloaded successfully!');
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const downloadReport = () => {
    if (!diagnosticResult) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('LungCare AI — Diagnostic Analysis Report', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Patient ID: ${user?.id || 'N/A'}`, 14, 34);

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(`Confidence Score: ${diagnosticResult.confidence}%`, 14, 46);
    doc.text(`Severity: ${diagnosticResult.severity.toUpperCase()}`, 14, 54);

    doc.text('Key Radiographic Findings:', 14, 66);
    doc.setFontSize(11);
    diagnosticResult.findings.forEach((finding, index) => {
      doc.text(`• ${finding}`, 18, 74 + index * 8);
    });

    let currentY = 74 + diagnosticResult.findings.length * 8 + 6;
    if (diagnosticResult.associated_symptoms && diagnosticResult.associated_symptoms.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Correlated Clinical Symptoms (For Reference, Not Detected from Image):', 14, currentY);
      currentY += 6;
      doc.text(diagnosticResult.associated_symptoms.join(', '), 18, currentY);
      currentY += 8;
      doc.setTextColor(30, 41, 59);
    } else {
      currentY += 2;
    }
    doc.setFontSize(13);
    doc.text('Disease Probabilities:', 14, currentY);
    currentY += 8;
    doc.setFontSize(11);
    Object.entries(diagnosticResult.disease_probabilities).forEach(([disease, prob]) => {
      doc.text(`• ${disease}: ${prob}%`, 18, currentY);
      currentY += 8;
    });

    currentY += 4;
    doc.setFontSize(13);
    doc.text('Clinical Recommendation:', 14, currentY);
    currentY += 8;
    doc.setFontSize(10);
    const splitRecommendation = doc.splitTextToSize(diagnosticResult.recommendation, 180);
    doc.text(splitRecommendation, 14, currentY);

    doc.save(`LungCare_Report_${Date.now()}.pdf`);
    setNotification('Report downloaded successfully!');
    setTimeout(() => setNotification(null), 5000);
  };

  const resetAnalysis = () => {
    setUploadedImage(undefined);
    setSelectedFile(null);
    setDiagnosticResult(null);
    setIsAnalyzing(false);
    setProgress(0);
    setError(null);
    setNotification('Analysis reset.');
    setTimeout(() => setNotification(null), 4000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'moderate':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'severe':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl flex items-center space-x-3 text-slate-200">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
          <span className="font-medium text-sm">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user || !auth.currentUser) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col">
        <Navbar userRole="patient" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 shadow-2xl max-w-md w-full text-center">
            <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-300 text-sm mb-6">
              Please sign in to access AI-powered X-Ray diagnosis and view historical reports.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-400 transition shadow-glow-cyan"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar userRole={user.role} />

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        {/* Header Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <Link
              to={user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'}
              className="hover:text-cyan-400 flex items-center transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>DenseNet-121 Neural Engine</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Scan className="w-7 h-7 text-cyan-400" />
                <span>AI Chest X-Ray Diagnostics</span>
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Upload a standard PA/AP chest radiograph for multi-label pathology classification and Grad-CAM localized heatmaps.
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
          <div className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-200 flex items-start justify-between shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium leading-relaxed">{error}</span>
            </div>
            {error.includes('Failed to analyze X-ray') && (
              <button
                onClick={retryAnalysis}
                className="ml-4 px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg hover:bg-rose-500/30 transition flex items-center flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Upload Card */}
        <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-10 mb-8 bg-navy-900/90 relative overflow-hidden">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 p-0.5 shadow-glow-cyan mx-auto mb-4">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <FileImage className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Select Chest Radiograph</h3>
            <p className="text-slate-300 text-xs sm:text-sm mb-6">
              Standard medical image formats supported: PNG, JPG, JPEG (up to 10MB).
            </p>

            <div className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-8 hover:border-cyan-400 hover:bg-navy-850/60 transition cursor-pointer group">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                className="hidden"
                id="xray-upload"
              />
              <label htmlFor="xray-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="h-10 w-10 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-white font-semibold text-sm">Click to browse or drag and drop</span>
                <span className="text-slate-400 text-xs mt-1">High-resolution standard chest radiograph</span>
              </label>
            </div>
          </div>

          {/* Uploaded Image Preview & Action Controls */}
          {uploadedImage && (
            <div className="mt-8 pt-8 border-t border-cyan-500/15">
              <div className="max-w-md mx-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 text-center">
                  Image Preview Stage
                </h4>
                <div className="bg-navy-950 rounded-2xl p-3 border border-cyan-500/30 shadow-inner flex items-center justify-center overflow-hidden">
                  <img
                    src={uploadedImage}
                    alt="Uploaded X-ray"
                    className="max-h-72 w-auto object-contain rounded-xl"
                  />
                </div>

                {/* Progress Indicator */}
                {isAnalyzing && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-semibold text-cyan-300 mb-1.5 font-mono">
                      <span>Computing DenseNet-121 layer weights...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-navy-950 rounded-full h-3 overflow-hidden border border-cyan-500/30 p-0.5">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-glow-cyan"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={analyzeImage}
                    disabled={isAnalyzing || !uploadedImage}
                    className={`px-6 py-3 bg-gradient-to-r from-blue-600 via-royal-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold text-sm shadow-glow-cyan transition flex items-center active:scale-95 ${
                      isAnalyzing || !uploadedImage ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        <span>Analyzing Radiograph...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4 mr-2" />
                        <span>Run AI Analysis</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetAnalysis}
                    disabled={isAnalyzing}
                    className="px-4 py-3 bg-navy-850 hover:bg-navy-800 text-slate-300 hover:text-white border border-cyan-500/25 rounded-xl font-semibold text-sm transition"
                  >
                    <X className="w-4 h-4 inline-block mr-1" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Results Card */}
        {diagnosticResult && (
          <div className="glass-panel rounded-3xl border border-cyan-500/25 shadow-2xl p-6 sm:p-10 mb-8 bg-navy-900/90 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-cyan-500/15 gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Diagnostic Screening Summary
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Pathology Inference Report
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${getSeverityBadge(diagnosticResult.severity)}`}>
                  SEVERITY: {diagnosticResult.severity.toUpperCase()}
                </span>
                <button
                  onClick={downloadReport}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-glow-cyan flex items-center"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {/* Model Confidence & Target Condition Probabilities */}
            <div className="grid md:grid-cols-2 gap-6 my-6">
              {/* Confidence Metric */}
              <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/20 bg-navy-950/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Model Confidence Score</span>
                  <span className="text-cyan-400 font-mono text-base">{diagnosticResult.confidence}%</span>
                </h4>
                <div className="w-full bg-navy-900 rounded-full h-3 overflow-hidden border border-cyan-500/20 p-0.5 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-glow-cyan"
                    style={{ width: `${diagnosticResult.confidence}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Derived from sigmoid activation layer outputs across calibrated chest pathology classes.
                </p>
              </div>

              {/* Disease Probabilities */}
              <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/20 bg-navy-950/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Target Condition Probabilities
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(diagnosticResult.disease_probabilities).map(([disease, prob]) => (
                    <div key={disease} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{disease}</span>
                        <span className="font-mono font-bold text-cyan-300">{prob}%</span>
                      </div>
                      <div className="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(prob, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Findings & Recommendations */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/20 bg-navy-950/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Key Radiographic Findings
                </h4>
                <ul className="space-y-2">
                  {diagnosticResult.findings.map((finding, idx) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-slate-200">
                      <CheckCircle className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>

                {diagnosticResult.associated_symptoms && diagnosticResult.associated_symptoms.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/15">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Correlated Symptoms (Reference Only)
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {diagnosticResult.associated_symptoms.map((symptom, idx) => (
                        <span
                          key={idx}
                          className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg capitalize font-medium"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card-static rounded-2xl p-5 border border-cyan-500/20 bg-navy-950/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Clinical Recommendation
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-navy-900/60 p-4 rounded-xl border border-cyan-500/15">
                  {diagnosticResult.recommendation}
                </p>
              </div>
            </div>

            {/* Grad-CAM Visualization */}
            {diagnosticResult.gradcam_image && (
              <div className="glass-card-static rounded-2xl p-6 border border-cyan-500/20 bg-navy-950/70 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Grad-CAM Activation Heatmap</span>
                    </h4>
                    <p className="text-xs text-slate-400">Visual explanation highlighting regions that influenced the model's decision.</p>
                  </div>
                  <button
                    onClick={downloadGradCam}
                    className="self-start px-3.5 py-1.5 bg-navy-850 hover:bg-navy-800 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold transition flex items-center"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    <span>Download Heatmap</span>
                  </button>
                </div>
                <div className="bg-navy-950 rounded-2xl p-3 border border-cyan-500/30 flex items-center justify-center max-w-md mx-auto shadow-inner">
                  <img
                    src={diagnosticResult.gradcam_image}
                    alt="Grad-CAM heatmap"
                    className="max-h-80 w-auto object-contain rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-100">Medical Notice:</span> This AI tool is intended for clinical decision support and preliminary screening. It does not replace formal radiographic interpretation by a board-certified radiologist or licensed medical professional.
              </div>
            </div>
          </div>
        )}

        {/* Previous Diagnoses History */}
        {diagnoses.length > 0 && (
          <div className="glass-panel rounded-3xl border border-cyan-500/20 shadow-2xl p-6 sm:p-8 bg-navy-900/90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cyan-500/15 gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>Diagnostic History</span>
                </h3>
                <p className="text-xs text-slate-400">Previous scans analyzed for your account</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'severity')}
                  aria-label="Sort previous diagnoses"
                  className="px-3 py-1.5 rounded-xl bg-navy-950 border border-cyan-500/30 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="date">Date (Newest First)</option>
                  <option value="severity">Severity</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cyan-500/15 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Radiograph</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {diagnoses.map((diag) => (
                    <tr key={diag.xray_id} className="hover:bg-navy-850/50 transition">
                      <td className="py-3 px-4 text-slate-300 font-medium text-xs">
                        {parseDate(diag.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSeverityBadge(diag.severity)}`}>
                          {diag.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300 font-mono font-bold text-xs">{diag.confidence}%</td>
                      <td className="py-3 px-4">
                        {diag.image_url ? (
                          <img
                            src={diag.image_url}
                            alt="Scan thumbnail"
                            className="h-12 w-12 object-cover rounded-lg border border-cyan-500/25 shadow-sm"
                          />
                        ) : (
                          <span className="text-slate-500 text-xs">No preview</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default XrayAnalysis;
