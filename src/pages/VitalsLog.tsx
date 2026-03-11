import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, Plus, History, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VitalsLog() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    systolic: '',
    diastolic: '',
    blood_sugar: '',
    creatinine: '',
    urine_protein: 'Negative',
    weight: '',
    edema: false,
    fatigue: 5,
    medications: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient/vitals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLogs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/patient/vitals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        fetchLogs();
        setFormData({
          systolic: '',
          diastolic: '',
          blood_sugar: '',
          creatinine: '',
          urine_protein: 'Negative',
          weight: '',
          edema: false,
          fatigue: 5,
          medications: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('vitals.title')}</h1>
          <p className="text-slate-500">Track your daily health metrics</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e] transition-all shadow-lg shadow-[#1A6B8A]/20"
        >
          {showForm ? <Activity className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'View History' : 'Log New Vitals'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Systolic BP</label>
                  <input
                    type="number"
                    required
                    value={formData.systolic}
                    onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Diastolic BP</label>
                  <input
                    type="number"
                    required
                    value={formData.diastolic}
                    onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                    placeholder="80"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Blood Sugar (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.blood_sugar}
                    onChange={(e) => setFormData({ ...formData, blood_sugar: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                    placeholder="5.6"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Creatinine (mg/dL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.creatinine}
                    onChange={(e) => setFormData({ ...formData, creatinine: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                    placeholder="1.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Urine Protein (Dipstick)</label>
                <select
                  value={formData.urine_protein}
                  onChange={(e) => setFormData({ ...formData, urine_protein: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20"
                >
                  <option>Negative</option>
                  <option>Trace</option>
                  <option>1+</option>
                  <option>2+</option>
                  <option>3+</option>
                  <option>4+</option>
                </select>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="edema"
                  checked={formData.edema}
                  onChange={(e) => setFormData({ ...formData, edema: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#1A6B8A] focus:ring-[#1A6B8A]"
                />
                <label htmlFor="edema" className="text-sm font-semibold text-slate-700">Are you experiencing any swelling (edema)?</label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Fatigue Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.fatigue}
                  onChange={(e) => setFormData({ ...formData, fatigue: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A6B8A]"
                />
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>LOW</span>
                  <span>HIGH</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Submit Daily Log
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
              </div>
            ) : logs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-lg font-black text-slate-700 leading-none">{new Date(log.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{log.systolic}/{log.diastolic} <span className="text-xs text-slate-400 font-normal">mmHg</span></p>
                        <p className="text-xs text-slate-500">Blood Pressure</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                      <div>
                        <p className="font-bold text-slate-700">{log.blood_sugar}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Sugar</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{log.creatinine}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Creatinine</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{log.urine_protein}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Protein</p>
                      </div>
                      <div>
                        <p className={`font-bold ${log.edema ? 'text-red-500' : 'text-emerald-500'}`}>{log.edema ? 'Yes' : 'No'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Edema</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No vitals logged yet. Start tracking your health today!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
