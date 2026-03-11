import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, TrendingDown, AlertCircle, Calendar, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function PatientDashboard() {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [gfrHistory, setGfrHistory] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const isProfileIncomplete = Boolean(profile && (!profile.age || !profile.weight || !profile.sex));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [pRes, gRes, rRes] = await Promise.all([
      fetch('/api/patient/profile', { headers }),
      fetch('/api/patient/gfr-history', { headers }),
      fetch('/api/patient/risk-score', { headers })
    ]);
    
    setProfile(await pRes.json());
    setGfrHistory(await gRes.json());
    const riskData = await rRes.json();
    setRiskScore(riskData.score);
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score <= 50) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (score <= 75) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 25) return t('risk.low');
    if (score <= 50) return t('risk.moderate');
    if (score <= 75) return t('risk.high');
    return t('risk.critical');
  };

  return (
    <div className="space-y-8">
      {isProfileIncomplete && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-1 h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.18)]"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                <p className="text-sm font-bold text-amber-900">Complete your profile</p>
              </div>
              <p className="text-sm font-medium text-amber-800">
                Please add your age, sex, and weight before continuing. This reminder will stay visible until your profile is completed.
              </p>
            </div>
          </div>
          <button 
            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }))}
          >
            Complete Profile
          </button>
        </motion.div>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.welcome')}, {user?.name}</h1>
          <p className="text-slate-500">Here's your kidney health overview</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-500">Last updated</p>
          <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className={`p-6 rounded-3xl border ${getRiskColor(riskScore)} flex flex-col justify-between h-48`}
        >
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-white/50">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Live Risk Engine</span>
          </div>
          <div>
            <p className="text-4xl font-black">{riskScore}/100</p>
            <p className="font-bold mt-1">{getRiskLabel(riskScore)}</p>
          </div>
        </motion.div>

        {/* Latest GFR Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between h-48"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest eGFR</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">
              {gfrHistory.length > 0 ? Math.round(gfrHistory[gfrHistory.length - 1].mdrd) : '--'}
            </p>
            <p className="text-slate-500 font-medium mt-1">mL/min/1.73m²</p>
          </div>
        </motion.div>

        {/* CKD Stage Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between h-48"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Stage</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">
              Stage {gfrHistory.length > 0 ? gfrHistory[gfrHistory.length - 1].stage : '--'}
            </p>
            <p className="text-slate-500 font-medium mt-1">Chronic Kidney Disease</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GFR Trend Chart */}
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">{t('dashboard.gfr_trend')}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gfrHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mdrd" 
                  stroke="#1A6B8A" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#1A6B8A', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions & Recommendations */}
        <div className="space-y-6">
          <div className="p-8 bg-slate-900 text-white rounded-3xl">
            <h3 className="text-xl font-bold mb-4">Clinical Recommendation</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              {gfrHistory.length > 0 
                ? gfrHistory[gfrHistory.length - 1].recommendation 
                : "Please complete your first GFR calculation to receive personalized recommendations."}
            </p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'education' }))}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
            >
              View Action Plan
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Alerts</h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Medication Reminder</p>
                  <p className="text-sm text-amber-700">Don't forget to take your blood pressure medication today.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
