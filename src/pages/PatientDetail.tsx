import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, ArrowLeft, Calendar, Calculator, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function PatientDetail({ id, onBack }: { id: string, onBack: () => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/doctor/patient/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(d => {
      setData(d);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
    </div>
  );

  const { patient, vitals, gfr } = data;

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-[#1A6B8A] font-bold transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Patient List
      </button>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 text-3xl font-black">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-slate-500 font-medium">{patient.district}, Bangladesh • {patient.age} years • {patient.sex}</p>
            <div className="flex gap-2 mt-3">
              {patient.diabetes && <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-md border border-red-100 uppercase">Diabetes</span>}
              {patient.hypertension && <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-md border border-amber-100 uppercase">Hypertension</span>}
            </div>
          </div>
        </div>
        
        <div className="flex gap-12">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">CKD Stage</p>
            <p className="text-3xl font-black text-[#1A6B8A]">Stage {patient.ckd_stage || '--'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Risk Score</p>
            <p className="text-3xl font-black text-orange-500">{patient.risk_score || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GFR History Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#1A6B8A]" />
            eGFR Progression
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...gfr].reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="mdrd" stroke="#1A6B8A" strokeWidth={4} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cg" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Vitals Table */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1A6B8A]" />
            Recent Vitals Log
          </h3>
          <div className="space-y-4">
            {vitals.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-slate-400">
                    {new Date(v.date).toLocaleDateString()}
                  </div>
                  <div className="font-bold text-slate-900">
                    {v.systolic}/{v.diastolic} <span className="text-[10px] font-normal text-slate-500">mmHg</span>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-slate-700">{v.blood_sugar}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Sugar</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-700">{v.creatinine}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Creat</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
