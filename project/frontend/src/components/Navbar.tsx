import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  Activity,
  Home,
  User,
  Scan,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ChevronDown,
  ShieldCheck,
  FileSearch
} from 'lucide-react';

interface NavbarProps {
  userRole?: 'patient' | 'doctor' | null;
}

const Navbar: React.FC<NavbarProps> = ({ userRole: initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role?: 'patient' | 'doctor'; name?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({ id: user.uid, role: data.role, name: data.name });
          } else {
            setCurrentUser({ id: user.uid, role: initialRole || undefined });
          }
        } catch {
          setCurrentUser({ id: user.uid, role: initialRole || undefined });
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [initialRole]);

  const activeRole = currentUser?.role || initialRole;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setIsMenuOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  const handleXrayClick = () => {
    setIsMenuOpen(false);
    if (!currentUser && !auth.currentUser) {
      navigate('/login');
    } else {
      navigate('/xray');
    }
  };

  const handleDashboardClick = () => {
    setIsMenuOpen(false);
    if (!currentUser && !auth.currentUser) {
      navigate('/login');
    } else {
      navigate(activeRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-cyan-500/15 bg-navy-950/90 backdrop-blur-xl transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Brand Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-xl p-1 transition group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-600 via-royal-600 to-cyan-500 shadow-glow-cyan text-white p-0.5">
              <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center group-hover:bg-opacity-80 transition">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                  LungCare
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  AI
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide block">
                Thoracic Diagnostics
              </span>
            </div>
          </button>

          {/* Center Navigation Links (Services, About, Contact) */}
          <div className="hidden lg:flex items-center space-x-8">
            <button
              onClick={() => handleSectionClick('services')}
              className="text-slate-300 hover:text-cyan-400 font-medium text-sm transition-colors tracking-wide"
            >
              Services
            </button>
            <button
              onClick={() => handleSectionClick('technology')}
              className="text-slate-300 hover:text-cyan-400 font-medium text-sm transition-colors tracking-wide"
            >
              Technology
            </button>
            <button
              onClick={() => handleSectionClick('about')}
              className="text-slate-300 hover:text-cyan-400 font-medium text-sm transition-colors tracking-wide"
            >
              About
            </button>
            <button
              onClick={() => handleSectionClick('contact')}
              className="text-slate-300 hover:text-cyan-400 font-medium text-sm transition-colors tracking-wide"
            >
              Contact
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={handleXrayClick}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-glow-cyan transition-all duration-200 flex items-center gap-1.5 active:scale-95"
            >
              <FileSearch className="w-4 h-4 text-cyan-200" />
              <span>X-Ray Diagnostics</span>
            </button>

            <button
              onClick={handleDashboardClick}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-navy-850/80 hover:bg-navy-800 text-slate-200 hover:text-white border border-cyan-500/25 transition-all duration-200 flex items-center gap-1.5 active:scale-95"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>{activeRole === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard'}</span>
            </button>

            {currentUser ? (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition ml-1"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-cyan-400 px-3 py-2 transition ml-1"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Hamburger Menu Button for Mobile/Tablet */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={handleXrayClick}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm flex items-center gap-1"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>X-Ray</span>
            </button>
            <button
              className="text-slate-300 hover:text-white p-2 rounded-xl bg-navy-850 border border-cyan-500/20 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-cyan-400" /> : <Menu className="h-6 w-6 text-slate-200" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-cyan-500/20 py-4 space-y-2 bg-navy-950/95 backdrop-blur-2xl px-2 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 pb-3 mb-2 border-b border-cyan-500/15">
              <button
                onClick={() => {
                  navigate('/');
                  setIsMenuOpen(false);
                }}
                className="text-slate-300 hover:text-white hover:bg-navy-850 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-medium"
              >
                <Home className="h-4 w-4 text-cyan-400" />
                <span>Home</span>
              </button>
              <button
                onClick={handleDashboardClick}
                className="text-slate-300 hover:text-white hover:bg-navy-850 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-medium"
              >
                <User className="h-4 w-4 text-cyan-400" />
                <span>{activeRole === 'doctor' ? 'Doctor Portal' : 'Patient Portal'}</span>
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => handleSectionClick('services')}
                className="w-full text-left text-slate-300 hover:text-cyan-400 hover:bg-navy-850 px-3 py-2 rounded-lg text-sm font-medium transition"
              >
                Services
              </button>
              <button
                onClick={() => handleSectionClick('technology')}
                className="w-full text-left text-slate-300 hover:text-cyan-400 hover:bg-navy-850 px-3 py-2 rounded-lg text-sm font-medium transition"
              >
                Technology
              </button>
              <button
                onClick={() => handleSectionClick('about')}
                className="w-full text-left text-slate-300 hover:text-cyan-400 hover:bg-navy-850 px-3 py-2 rounded-lg text-sm font-medium transition"
              >
                About
              </button>
              <button
                onClick={() => handleSectionClick('contact')}
                className="w-full text-left text-slate-300 hover:text-cyan-400 hover:bg-navy-850 px-3 py-2 rounded-lg text-sm font-medium transition"
              >
                Contact & Support
              </button>
            </div>

            <div className="pt-3 border-t border-cyan-500/15 space-y-2">
              <button
                onClick={handleXrayClick}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-glow-cyan"
              >
                <FileSearch className="w-4 h-4" />
                <span>Start X-Ray Diagnostics</span>
              </button>

              {currentUser ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-rose-500/15 text-rose-300 border border-rose-500/30 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-rose-500/25 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate('/login');
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-navy-850 text-slate-200 border border-cyan-500/20 py-2.5 rounded-xl text-sm font-medium hover:bg-navy-800 transition text-center"
                >
                  Sign In to Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
