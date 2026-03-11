import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Download, FileText, Loader2, Map as MapIcon, Users } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type HeatmapRow = {
  district: string;
  count: number;
  avg_risk: number | null;
};

type PolicyReport = {
  id: string;
  title: string;
  desc: string;
  date: string;
  filename: string;
  content: string;
};

const DISTRICTS_COORDS: Record<string, [number, number]> = {
  Dhaka: [23.8103, 90.4125],
  Chittagong: [22.3569, 91.7832],
  Rajshahi: [24.3745, 88.6042],
  Khulna: [22.8456, 89.5403],
  Barisal: [22.701, 90.3535],
  Sylhet: [24.8949, 91.8687],
  Rangpur: [25.7439, 89.2752],
  Mymensingh: [24.7471, 90.4203],
  Gazipur: [24.0023, 90.4264],
  Narayanganj: [23.6238, 90.5],
};

function downloadTextFile(content: string, filename: string, type = 'text/markdown;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ initialTab = 'heatmap' }: { initialTab?: 'heatmap' | 'reports' }) {
  const { token } = useAuth();
  const [heatmapData, setHeatmapData] = useState<HeatmapRow[]>([]);
  const [reports, setReports] = useState<PolicyReport[]>([]);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'reports'>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isResearchExporting, setIsResearchExporting] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const loadAdminData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [heatmapRes, reportsRes] = await Promise.all([
          fetch('/api/admin/heatmap', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/admin/reports', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!heatmapRes.ok || !reportsRes.ok) {
          throw new Error('Failed to load admin data.');
        }

        const [heatmapJson, reportsJson] = await Promise.all([
          heatmapRes.json(),
          reportsRes.json(),
        ]);

        if (!isMounted) return;
        setHeatmapData(Array.isArray(heatmapJson) ? heatmapJson : []);
        setReports(Array.isArray(reportsJson) ? reportsJson : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const sortedHeatmap = [...heatmapData].sort((a, b) => b.count - a.count);
  const totalPatients = heatmapData.reduce((sum, row) => sum + row.count, 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/export-national-report', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to export national report.');
      }

      const data = await res.json();
      downloadTextFile(data.content, data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export national report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResearchExport = async () => {
    setIsResearchExporting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/export-research-data', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to export research data.');
      }

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No patient data available for export.');
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row: Record<string, unknown>) =>
          headers
            .map((header) => {
              const value = row[header];
              const normalized = value === null || value === undefined ? '' : String(value);
              return `"${normalized.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ].join('\n');

      downloadTextFile(
        csvContent,
        `KidneyCareBD_Research_Data_${new Date().toISOString().split('T')[0]}.csv`,
        'text/csv;charset=utf-8;'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export research data.');
    } finally {
      setIsResearchExporting(false);
    }
  };

  const handleReportDownload = (report: PolicyReport) => {
    setDownloadingReportId(report.id);
    try {
      downloadTextFile(report.content, report.filename);
    } finally {
      setDownloadingReportId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A6B8A]" />
      </div>
    );
  }

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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

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
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{totalPatients}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Patients</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Top Districts</h3>
              {sortedHeatmap.length ? (
                <div className="space-y-3">
                  {sortedHeatmap.slice(0, 5).map((district) => (
                    <div key={district.district} className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{district.district}</span>
                      <span className="text-sm font-bold text-slate-900">{district.count} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No district-level patient records available yet.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm h-[600px] overflow-hidden relative">
              {heatmapData.length ? (
                <>
                  <MapContainer
                    {...{
                      center: [23.685, 90.3563] as [number, number],
                      zoom: 7,
                    }}
                    style={{ height: '100%', width: '100%', borderRadius: '20px' }}
                  >
                    <TileLayer
                      {...{
                        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                      }}
                    />
                    {heatmapData.map((district) => {
                      const coords = DISTRICTS_COORDS[district.district] || [23.8103, 90.4125];
                      return (
                        <CircleMarker
                          key={district.district}
                          {...{
                            center: coords,
                            radius: Math.max(10, district.count * 5),
                            fillColor: (district.avg_risk ?? 0) > 50 ? '#E74C3C' : '#F39C12',
                            color: '#fff',
                            weight: 2,
                            fillOpacity: 0.6,
                          }}
                        >
                          <Popup>
                            <div className="p-2">
                              <p className="font-bold text-slate-900">{district.district}</p>
                              <p className="text-xs text-slate-500">Patients: {district.count}</p>
                              <p className="text-xs text-slate-500">Avg Risk: {Math.round(district.avg_risk ?? 0)}</p>
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
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-slate-500 px-6">
                  No patient location data is available yet. Add patient registrations to populate the CKD heatmap.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reports.length ? (
            reports.map((report) => (
              <div key={report.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-[#1A6B8A] group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">{report.date}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#1A6B8A] transition-colors">{report.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{report.desc}</p>
                <button
                  onClick={() => handleReportDownload(report)}
                  disabled={downloadingReportId === report.id}
                  className="mt-6 text-sm font-bold text-[#1A6B8A] flex items-center gap-2 hover:underline disabled:opacity-50"
                >
                  {downloadingReportId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download Full Report
                </button>
              </div>
            ))
          ) : (
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-500">
              No policy reports are available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
