import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.name': 'KidneyCare BD',
    'nav.dashboard': 'Dashboard',
    'nav.gfr': 'GFR Calculator',
    'nav.vitals': 'Vitals Log',
    'nav.education': 'Education',
    'nav.cost': 'Cost Planner',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'dashboard.welcome': 'Welcome back',
    'dashboard.risk_score': 'CKD Risk Score',
    'dashboard.gfr_trend': 'eGFR Trend',
    'gfr.title': 'Smart GFR Calculator',
    'gfr.creatinine': 'Serum Creatinine (mg/dL)',
    'gfr.age': 'Age',
    'gfr.weight': 'Weight (kg)',
    'gfr.sex': 'Sex',
    'gfr.calculate': 'Calculate GFR',
    'vitals.title': 'Health Vitals Log',
    'vitals.bp': 'Blood Pressure (Sys/Dia)',
    'vitals.sugar': 'Blood Sugar',
    'vitals.protein': 'Urine Protein',
    'vitals.log': 'Log Vitals',
    'risk.low': 'Low Risk',
    'risk.moderate': 'Moderate Risk',
    'risk.high': 'High Risk',
    'risk.critical': 'Critical Risk',
    'edu.title': 'CKD Education Hub',
    'cost.title': 'Treatment Cost Estimator',
    'doctor.patients': 'My Patients',
    'doctor.alerts': 'Clinical Alerts',
    'admin.heatmap': 'CKD Heatmap',
    'admin.reports': 'Policy Reports',
  },
  bn: {
    'app.name': 'কিডনিকেয়ার বিডি',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.gfr': 'জিএফআর ক্যালকুলেটর',
    'nav.vitals': 'ভাইটালস লগ',
    'nav.education': 'শিক্ষা',
    'nav.cost': 'খরচ পরিকল্পনা',
    'nav.login': 'লগইন',
    'nav.register': 'নিবন্ধন',
    'dashboard.welcome': 'স্বাগতম',
    'dashboard.risk_score': 'সিকেডি ঝুঁকির স্কোর',
    'dashboard.gfr_trend': 'ইজিএফআর ট্রেন্ড',
    'gfr.title': 'স্মার্ট জিএফআর ক্যালকুলেটর',
    'gfr.creatinine': 'সিরাম ক্রিয়েটিনিন (mg/dL)',
    'gfr.age': 'বয়স',
    'gfr.weight': 'ওজন (কেজি)',
    'gfr.sex': 'লিঙ্গ',
    'gfr.calculate': 'জিএফআর গণনা করুন',
    'vitals.title': 'স্বাস্থ্য ভাইটালস লগ',
    'vitals.bp': 'রক্তচাপ (সিস্টোলিক/ডায়াস্টোলিক)',
    'vitals.sugar': 'রক্তের শর্করা',
    'vitals.protein': 'প্রস্রাবে প্রোটিন',
    'vitals.log': 'ভাইটালস লগ করুন',
    'risk.low': 'কম ঝুঁকি',
    'risk.moderate': 'মাঝারি ঝুঁকি',
    'risk.high': 'উচ্চ ঝুঁকি',
    'risk.critical': 'মারাত্মক ঝুঁকি',
    'edu.title': 'সিকেডি শিক্ষা কেন্দ্র',
    'cost.title': 'চিকিৎসা খরচ অনুমানকারী',
    'doctor.patients': 'আমার রোগী',
    'doctor.alerts': 'ক্লিনিকাল সতর্কতা',
    'admin.heatmap': 'সিকেডি হিটম্যাপ',
    'admin.reports': 'পলিসি রিপোর্ট',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
