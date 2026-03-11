import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Info, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function GfrCalculator() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    creatinine: '',
    age: '',
    sex: 'male',
    weight: ''
  });
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/patient/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setFormData(prev => ({
            ...prev,
            age: data.age?.toString() || '',
            sex: data.sex || 'male',
            weight: data.weight?.toString() || ''
          }));
        }
      });
  }, [token]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/patient/gfr', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatinine: parseFloat(formData.creatinine),
          age: parseInt(formData.age),
          sex: formData.sex,
          weight: parseFloat(formData.weight)
        }),
      });
      setResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">{t('gfr.title')}</h1>
        <p className="text-slate-500 mt-2">Calculate your kidney function using clinical formulas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.creatinine')}</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.creatinine}
                onChange={(e) => setFormData({ ...formData, creatinine: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                placeholder="e.g. 1.2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('gfr.age')}</label>
                <input
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  placeholder="45"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('gfr.weight')}</label>
                <input
                  type="number"
                  required
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A6B8A]/20 focus:border-[#1A6B8A]"
                  placeholder="70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t('gfr.sex')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sex: 'male' })}
                  className={`py-3 rounded-xl border font-medium transition-all ${
                    formData.sex === 'male' ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sex: 'female' })}
                  className={`py-3 rounded-xl border font-medium transition-all ${
                    formData.sex === 'female' ? 'bg-[#1A6B8A] text-white border-[#1A6B8A]' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
              {t('gfr.calculate')}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Calculation Results</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">MDRD Equation</p>
                  <p className="text-2xl font-black text-[#1A6B8A]">{Math.round(result.mdrd)} <span className="text-sm font-normal text-slate-400">mL/min</span></p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Cockcroft-Gault (CG)</p>
                  <p className="text-2xl font-black text-[#1A6B8A]">{Math.round(result.cg)} <span className="text-sm font-normal text-slate-400">mL/min</span></p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">CKD-EPI Equation</p>
                  <p className="text-2xl font-black text-[#1A6B8A]">{Math.round(result.ckdEpi)} <span className="text-sm font-normal text-slate-400">mL/min</span></p>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${
                result.stage >= 4 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.stage >= 4 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  <p className="font-bold text-lg">CKD Stage {result.stage}</p>
                </div>
                <p className="text-sm font-medium">{result.recommendation}</p>
              </div>
            </motion.div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Info className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium">Enter your clinical data to see GFR results and staging information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
