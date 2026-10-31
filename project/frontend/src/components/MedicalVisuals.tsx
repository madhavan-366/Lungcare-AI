import React, { useState } from 'react';
import { Activity, Shield, Sparkles, CheckCircle2, Eye, Scan, Stethoscope, Cpu, Layers } from 'lucide-react';

/**
 * High-quality medical technology visual for the Hero Section
 * Shows a stylized chest radiograph, lung overlays, telemetry nodes, and DenseNet-121 indicators.
 */
export const HeroChestXrayVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg lg:max-w-none mx-auto select-none">
      {/* Background Glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-teal-400/20 blur-xl opacity-75 animate-pulse-glow" />

      {/* Main Container Card */}
      <div className="relative rounded-2xl glass-panel p-4 sm:p-6 shadow-2xl border border-cyan-500/20 bg-navy-900/90 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/15">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                <span>DenseNet-121 Radiographic Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[10px] text-cyan-300/70 font-mono">Tensor Normalization • Scaled [-1024, 1024]</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
            PA CHEST VIEW
          </span>
        </div>

        {/* Imaging Display Stage */}
        <div className="relative aspect-[4/3.4] rounded-xl bg-navy-950 border border-cyan-500/25 overflow-hidden flex items-center justify-center shadow-inner">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-medical-grid opacity-30 pointer-events-none" />

          {/* Realistic Stylized Chest X-Ray SVG Illustration */}
          <svg
            viewBox="0 0 400 340"
            className="w-full h-full object-contain p-2"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="lungFieldGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#0284C7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
                <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="gradcamSpot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.55" />
                <stop offset="40%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Thoracic Spine & Mediastinum Column */}
            <path
              d="M196 20 L204 20 L204 280 L196 280 Z"
              fill="#1E293B"
              stroke="#38BDF8"
              strokeWidth="0.8"
              strokeDasharray="4 2"
              opacity="0.4"
            />
            {/* Vertebral segments */}
            {[40, 65, 90, 115, 140, 165, 190, 215, 240].map((y, i) => (
              <rect
                key={i}
                x="192"
                y={y}
                width="16"
                height="16"
                rx="3"
                fill="#334155"
                stroke="#64748B"
                strokeWidth="0.75"
                opacity="0.6"
              />
            ))}

            {/* Clavicles */}
            <path
              d="M192 48 Q 130 35, 70 52"
              stroke="#94A3B8"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M208 48 Q 270 35, 330 52"
              stroke="#94A3B8"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Right Lung Field (Anatomical Left) */}
            <path
              d="M185 65 C 130 65, 80 100, 75 160 C 70 220, 85 260, 115 270 C 145 280, 175 255, 185 240 Z"
              fill="url(#lungFieldGrad)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              opacity="0.85"
            />

            {/* Left Lung Field with Cardiac Notch */}
            <path
              d="M215 65 C 270 65, 320 100, 325 160 C 330 220, 315 260, 285 270 C 255 280, 235 250, 225 210 C 220 185, 215 130, 215 65 Z"
              fill="url(#lungFieldGrad)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              opacity="0.85"
            />

            {/* Rib Contours (Bilateral) */}
            {[
              { dR: "M190 75 Q 120 85, 82 120", dL: "M210 75 Q 280 85, 318 120" },
              { dR: "M190 105 Q 115 120, 78 160", dL: "M210 105 Q 285 120, 322 160" },
              { dR: "M190 135 Q 110 155, 76 200", dL: "M210 135 Q 290 155, 324 200" },
              { dR: "M190 165 Q 110 190, 82 240", dL: "M210 165 Q 290 190, 318 240" },
              { dR: "M190 195 Q 120 225, 95 265", dL: "M210 195 Q 280 225, 305 265" },
            ].map((rib, i) => (
              <g key={i}>
                <path d={rib.dR} stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
                <path d={rib.dL} stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
              </g>
            ))}

            {/* Cardiac Silhouette (Heart Outline) */}
            <path
              d="M195 140 C 190 170, 170 215, 205 245 C 240 250, 245 200, 220 150 Z"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="1"
              opacity="0.75"
            />

            {/* Grad-CAM Demonstration Activation Overlay (Mid-Right Field) */}
            <circle cx="135" cy="175" r="45" fill="url(#gradcamSpot)" />

            {/* Diaphragm Dome Curves */}
            <path d="M70 270 Q 130 250, 190 275" stroke="#0284C7" strokeWidth="2" fill="none" opacity="0.7" />
            <path d="M210 275 Q 270 250, 330 270" stroke="#0284C7" strokeWidth="2" fill="none" opacity="0.7" />

            {/* Coordinate Target Reticles */}
            <g opacity="0.8">
              <circle cx="135" cy="175" r="14" stroke="#22D3EE" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="135" y1="155" x2="135" y2="195" stroke="#22D3EE" strokeWidth="0.8" />
              <line x1="115" y1="175" x2="155" y2="175" stroke="#22D3EE" strokeWidth="0.8" />
              <text x="145" y="152" fill="#38BDF8" fontSize="8" fontFamily="monospace">ROI [X:135, Y:175]</text>
            </g>
          </svg>

          {/* Animated Sweeping Scan Beam */}
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-400/20 to-cyan-400/5 border-b border-cyan-400/80 pointer-events-none animate-scanline shadow-[0_4px_16px_rgba(34,211,238,0.4)]" />

          {/* Floating Diagnostic Data Tag Overlays */}
          <div className="absolute top-3 left-3 bg-navy-900/85 backdrop-blur-md border border-cyan-500/30 rounded-lg px-2.5 py-1.5 shadow-lg">
            <span className="text-[10px] text-cyan-400 font-mono block">R. LUNG APEX</span>
            <span className="text-xs font-semibold text-white">Clear Radiodensity</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-navy-900/85 backdrop-blur-md border border-amber-500/40 rounded-lg px-2.5 py-1.5 shadow-lg flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-amber-300 font-mono block">GRAD-CAM ACTIVATION</span>
              <span className="text-xs font-semibold text-white">Visual Layer Output</span>
            </div>
          </div>
        </div>

        {/* Bottom Medical Telemetry Bar */}
        <div className="mt-4 pt-3 border-t border-cyan-500/15 grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-navy-950/60 border border-cyan-500/15">
            <span className="text-[10px] text-cyan-300/80 font-mono block uppercase">Backbone</span>
            <span className="text-sm font-bold text-white">DenseNet-121</span>
          </div>
          <div className="p-2 rounded-lg bg-navy-950/60 border border-cyan-500/15">
            <span className="text-[10px] text-cyan-300/80 font-mono block uppercase">Resolution</span>
            <span className="text-sm font-bold text-white">224 × 224 px</span>
          </div>
          <div className="p-2 rounded-lg bg-navy-950/60 border border-cyan-500/15">
            <span className="text-[10px] text-cyan-300/80 font-mono block uppercase">Explainability</span>
            <span className="text-sm font-bold text-cyan-400">Grad-CAM++</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive Chest X-Ray Section Visual (Section 5)
 * Allows toggling between Raw Radiograph and Grad-CAM Activation Heatmap.
 */
export const FeatureScannerVisual: React.FC = () => {
  const [viewMode, setViewMode] = useState<'both' | 'raw' | 'heatmap'>('both');

  return (
    <div className="rounded-2xl glass-panel p-5 sm:p-6 border border-cyan-500/20 bg-navy-900/90 shadow-2xl relative overflow-hidden">
      {/* View Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-cyan-500/15 gap-2">
        <div className="flex items-center space-x-2">
          <Scan className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">Radiographic Inspector</span>
        </div>
        <div className="flex items-center bg-navy-950/80 p-1 rounded-lg border border-cyan-500/20 text-xs">
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              viewMode === 'raw' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw X-Ray
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              viewMode === 'both' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overlay
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              viewMode === 'heatmap' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Screen Viewport */}
      <div className="relative aspect-[4/3.3] rounded-xl bg-navy-950 border border-cyan-500/25 overflow-hidden flex items-center justify-center shadow-inner">
        <div className="absolute inset-0 bg-medical-grid opacity-20 pointer-events-none" />

        <svg
          viewBox="0 0 400 320"
          className="w-full h-full object-contain"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="denseGradCam" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.7" />
              <stop offset="35%" stopColor="#F59E0B" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lungBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.02" />
            </radialGradient>
          </defs>

          {/* Spine & Ribs */}
          <rect x="194" y="30" width="12" height="240" rx="3" fill="#1E293B" stroke="#475569" strokeWidth="0.8" opacity="0.5" />
          {/* Lungs Structure */}
          <path
            d="M185 60 C 130 60, 80 95, 75 155 C 70 215, 85 250, 115 260 C 145 270, 175 245, 185 230 Z"
            fill="url(#lungBg)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            opacity={viewMode === 'heatmap' ? 0.3 : 0.8}
          />
          <path
            d="M215 60 C 270 60, 320 95, 325 155 C 330 215, 315 250, 285 260 C 255 270, 235 240, 225 200 C 220 175, 215 125, 215 60 Z"
            fill="url(#lungBg)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            opacity={viewMode === 'heatmap' ? 0.3 : 0.8}
          />

          {/* Rib Lines */}
          {[90, 125, 160, 195, 230].map((y, idx) => (
            <g key={idx} opacity={viewMode === 'heatmap' ? 0.2 : 0.45}>
              <path d={`M190 ${y} Q 115 ${y + 20}, 78 ${y + 40}`} stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
              <path d={`M210 ${y} Q 285 ${y + 20}, 322 ${y + 40}`} stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ))}

          {/* Heart Silhouette */}
          <path
            d="M195 130 C 190 160, 175 205, 205 235 C 235 240, 240 190, 220 140 Z"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="1"
            opacity="0.6"
          />

          {/* Grad-CAM Heatmap Layer (Shown in 'both' or 'heatmap' mode) */}
          {(viewMode === 'both' || viewMode === 'heatmap') && (
            <g>
              <ellipse cx="140" cy="180" rx="48" ry="42" fill="url(#denseGradCam)" />
              <circle cx="140" cy="180" r="18" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <text x="145" y="160" fill="#FCA5A5" fontSize="8" fontFamily="monospace">DenseNet-121 Focal Activation</text>
            </g>
          )}
        </svg>

        {/* Subtle scanline */}
        <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent pointer-events-none animate-scanline" />

        <div className="absolute bottom-3 left-3 bg-navy-950/85 backdrop-blur-md border border-cyan-500/30 rounded-lg px-2.5 py-1 text-[11px] text-cyan-300 font-mono">
          Model: DenseNet-121 • CheXpert / ChestX-ray14
        </div>
      </div>

      {/* Feature Bullet Points below viewer */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2 bg-navy-950/50 p-2 rounded-lg border border-cyan-500/10">
          <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Layer 4 Gradient Weights</span>
        </div>
        <div className="flex items-center space-x-2 bg-navy-950/50 p-2 rounded-lg border border-cyan-500/10">
          <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>PyTorch DenseNet-121</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Healthcare Team Visual for Section 6
 * A sophisticated doctor and digital telemedicine illustration.
 */
export const DoctorTeamVisual: React.FC = () => {
  return (
    <div className="rounded-2xl glass-panel p-6 border border-cyan-500/20 bg-navy-900/90 shadow-2xl relative overflow-hidden">
      <div className="relative aspect-[4/3] rounded-xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 border border-cyan-500/20 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        {/* Glow */}
        <div className="absolute w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Doctor Icon Illustration Avatar */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-navy-800 border-2 border-cyan-400/40 flex items-center justify-center shadow-lg text-cyan-300">
            <Stethoscope className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-navy-900">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-white">Verified Pulmonologists & Clinicians</h3>
        <p className="text-xs text-cyan-200/70 mt-1 max-w-sm">
          Bridging advanced radiographic intelligence with compassionate, board-qualified clinical review.
        </p>

        {/* Verification badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-400/25 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" /> Secure Doctor Directory
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Direct Teleconsultation
          </span>
        </div>
      </div>
    </div>
  );
};
