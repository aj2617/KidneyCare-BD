import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import {
  Activity, Calculator, BookOpen, DollarSign, LayoutDashboard,
  Users, Map as MapIcon, Bell, LogOut, Menu, X, Globe, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import GfrCalculator from './pages/GfrCalculator';
import VitalsLog from './pages/VitalsLog';
import Education from './pages/Education';
import CostPlanner from './pages/CostPlanner';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAlerts from './pages/DoctorAlerts';
import PatientDetail from './pages/PatientDetail';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

export default function App() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleNavigate = (e: any) => {
      setCurrentPage(e.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === 'patient') setCurrentPage('dashboard');
      else if (user.role === 'doctor') setCurrentPage('doctor-dashboard');
      else if (user.role === 'admin') setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('landing');
    }
  }, [user]);

  const navItems = {
    patient: [
      { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { id: 'gfr', label: t('nav.gfr'), icon: Calculator },
      { id: 'vitals', label: t('nav.vitals'), icon: Activity },
      { id: 'education', label: t('nav.education'), icon: BookOpen },
      { id: 'cost', label: t('nav.cost'), icon: DollarSign },
      { id: 'profile', label: 'Profile', icon: User },
    ],
    doctor: [
      { id: 'doctor-dashboard', label: t('doctor.patients'), icon: Users },
      { id: 'doctor-alerts', label: t('doctor.alerts'), icon: Bell },
    ],
    admin: [
      { id: 'admin-dashboard', label: t('admin.heatmap'), icon: MapIcon },
      { id: 'admin-reports', label: t('admin.reports'), icon: Activity },
    ]
  };

  const renderPage = () => {
    if (currentPage === 'landing') return <Landing onStart={() => setCurrentPage('register')} onLogin={() => setCurrentPage('login')} />;
    if (currentPage === 'login') return <Login onRegister={() => setCurrentPage('register')} />;
    if (currentPage === 'register') return <Register onLogin={() => setCurrentPage('login')} />;

    if (user?.role === 'patient') {
      switch (currentPage) {
        case 'dashboard': return <PatientDashboard />;
        case 'gfr': return <GfrCalculator />;
        case 'vitals': return <VitalsLog />;
        case 'education': return <Education />;
        case 'cost': return <CostPlanner />;
        case 'profile': return <Profile />;
      }
    }

    if (user?.role === 'doctor') {
      if (currentPage === 'doctor-dashboard') return <DoctorDashboard onSelectPatient={(id) => setCurrentPage(`patient-${id}`)} />;
      if (currentPage === 'doctor-alerts') return <DoctorAlerts />;
      if (currentPage.startsWith('patient-')) return <PatientDetail id={currentPage.split('-')[1]} onBack={() => setCurrentPage('doctor-dashboard')} />;
    }

    if (user?.role === 'admin') {
      return <AdminDashboard initialTab={currentPage === 'admin-reports' ? 'reports' : 'heatmap'} />;
    }

    return <div className="p-8">Page under construction: {currentPage}</div>;
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#1E293B] font-sans">
      {user ? (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center gap-2 text-[#1A6B8A] font-bold text-xl">
                  <Activity className="w-8 h-8" />
                  <span className="hidden sm:block">{t('app.name')}</span>
                </div>
                <div className="hidden md:ml-8 md:flex md:space-x-4">
                  {navItems[user.role].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                        currentPage === item.id
                          ? 'bg-[#1A6B8A]/10 text-[#1A6B8A]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="p-2 text-slate-500 hover:text-[#1A6B8A] transition-colors flex items-center gap-1 text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'বাংলা' : 'English'}
                </button>
                <div className="hidden md:flex items-center gap-4 pl-4 border-l border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  <button
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                <div className="md:hidden flex items-center">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-500"
                  >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-slate-100"
              >
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {navItems[user.role].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={logout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      ) : (
        <nav className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="min-h-[72px] flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentPage('landing')}
                className="flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#1A6B8A] text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-[#1A6B8A]/20">
                  K
                </div>
                <span className="text-[18px] md:text-[20px] font-black text-[#1A6B8A]">{t('app.name')}</span>
              </button>

              <div className="hidden md:flex items-center gap-4">
                <div className="h-7 w-px bg-slate-200" />
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="px-3 py-2 text-slate-600 hover:text-[#1A6B8A] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'বাংলা' : 'English'}
                </button>
                <button
                  onClick={() => setCurrentPage('login')}
                  className="px-4 py-2 text-[#1A6B8A] font-bold hover:text-[#14556e] transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="px-5 py-2.5 rounded-2xl bg-[#1A6B8A] text-white font-bold shadow-lg shadow-[#1A6B8A]/20 hover:bg-[#14556e] transition-all"
                >
                  Register
                </button>
              </div>

              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                  className="p-2 text-slate-500 hover:text-[#1A6B8A] transition-colors"
                  aria-label="Toggle language"
                >
                  <Globe className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage('login')}
                  className="px-3 py-2 text-sm font-bold text-[#1A6B8A]"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="px-4 py-2 rounded-xl bg-[#1A6B8A] text-white text-sm font-bold"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderPage()}
        </motion.div>
      </main>

      {!user && currentPage === 'landing' && (
        <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm">© 2026 KidneyCare BD. Supporting CKD patients across Bangladesh.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
