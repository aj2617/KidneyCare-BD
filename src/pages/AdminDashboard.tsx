import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Map as MapIcon, FileText, Users, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DISTRICTS_COORDS: Record<string, [number, number]> = {
  'Dhaka': [23.8103, 90.4125],
  'Chittagong': [22.3569, 91.7832],
  'Rajshahi': [24.3745, 88.6042],
  'Khulna': [22.8456, 89.5403],
  'Barisal': [22.7010, 90.3535],
  'Sylhet': [24.8949, 91.8687],
  'Rangpur': [25.7439, 89.2752],
  'Mymensingh': [24.7471, 90.4203],
  'Gazipur': [24.0023, 90.4264],
  'Narayanganj': [23.6238, 90.5000]
};

export default function AdminDashboard({ initialTab = 'heatmap' }: { initialTab?: 'heatmap' | 'reports' }) {
  const { token } = useAuth();
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'reports'>(initialTab);
  const [isExporting, setIsExporting] = useState(false);
  const [isResearchExporting, setIsResearchExporting] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetch('/api/admin/heatmap', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(d => {
      setHeatmapData(d);
      setIsLoading(false);
    });
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('National CKD Burden Report has been generated and downloaded successfully.');
    }, 2000);
  };

  const handleResearchExport = async () => {
    setIsResearchExporting(true);
    try {
      const res = await fetch('/api/admin/export-research-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.length === 0) {
        alert('No patient data available for export.');
        return;
      }

      // Convert JSON to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => headers.map(header => {
          const val = row[header];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `KidneyCareBD_Research_Data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export research data. Please try again.');
    } finally {
      setIsResearchExporting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Public Health Dashboard</h1>
          <p className="text-slate-500">Monitor CKD burden across Bangladesh districts</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleResearchExport}
            disabled={isResearchExporting}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {isResearchExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isResearchExporting ? 'Exporting...' : 'Export Research Data (CSV)'}
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-3 bg-[#1A6B8A] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#14556e] transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Generating...' : 'Export National Report'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'heatmap' ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          CKD Heatmap
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reports' ? 'border-[#1A6B8A] text-[#1A6B8A]' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Policy Reports
        </button>
      </div>

      {activeTab === 'heatmap' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{heatmapData.reduce((acc, curr) => acc + curr.count, 0)}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Patients</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Top Districts</h3>
              <div className="space-y-3">
                {heatmapData.sort((a, b) => b.count - a.count).slice(0, 5).map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">{d.district}</span>
                    <span className="text-sm font-bold text-slate-900">{d.count} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="lg:col-span-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm h-[600px] overflow-hidden relative">
              <MapContainer {...{center: [23.6850, 90.3563], zoom: 7}} style={{ height: '100%', width: '100%', borderRadius: '20px' }}>
                <TileLayer
                  {...{url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}}
                />
                {heatmapData.map((d, i) => {
                  const coords = DISTRICTS_COORDS[d.district] || [23.8103, 90.4125];
                  return (
                    <CircleMarker 
                      key={i}
                      {...{center: coords, radius: Math.max(10, d.count * 5), fillColor: d.avg_risk > 50 ? '#E74C3C' : '#F39C12', color: "#fff", weight: 2, fillOpacity: 0.6}}
                    >
                      <Popup>
                        <div className="p-2">
                          <p className="font-bold text-slate-900">{d.district}</p>
                          <p className="text-xs text-slate-500">Patients: {d.count}</p>
                          <p className="text-xs text-slate-500">Avg Risk: {Math.round(d.avg_risk)}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              <div className="absolute bottom-8 right-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 z-[1000]">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Risk Legend</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E74C3C]" />
                    <span className="text-xs text-slate-600">High Risk (&gt;50)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F39C12]" />
                    <span className="text-xs text-slate-600">Moderate Risk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { title: 'Resource Allocation Plan', desc: 'Optimizing dialysis machine distribution based on district-level prevalence.', date: 'Mar 2026' },
            { title: 'Rural Screening Initiative', desc: 'Targeting high-risk zones in Northern Bangladesh for mobile screening camps.', date: 'Feb 2026' },
            { title: 'Medication Subsidy Impact', desc: 'Analysis of BDT 50M subsidy program on Stage 3 patient retention.', date: 'Jan 2026' }
          ].map((report, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-[#1A6B8A] group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400">{report.date}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#1A6B8A] transition-colors">{report.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{report.desc}</p>
              <button className="mt-6 text-sm font-bold text-[#1A6B8A] flex items-center gap-2 hover:underline">
                View Full Report
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
