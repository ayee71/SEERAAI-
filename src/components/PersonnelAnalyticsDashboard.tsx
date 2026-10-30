import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { applyCourtWatermarkToPDF } from '../services/watermarkService';

interface PersonnelAnalyticsDashboardProps {
  analyticsDataByStatus: { name: string; value: number }[];
  analyticsDataByPriority: { name: string; value: number }[];
  activeSession: any;
}

export const PersonnelAnalyticsDashboard: React.FC<PersonnelAnalyticsDashboardProps> = ({ 
  analyticsDataByStatus, 
  analyticsDataByPriority,
  activeSession
}) => {
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      applyCourtWatermarkToPDF(pdf, {
        courtName: activeSession?.courtName,
        userName: activeSession?.user.fullName,
        role: activeSession?.user.role,
      });
      pdf.save(`SeeraAI_Analytics_Report_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="space-y-6 mb-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          Personnel Analytics Overview
        </h2>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export Analytics PDF
        </button>
      </div>

      <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-950 rounded-3xl border border-slate-900/50">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Case Load by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsDataByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6" 
                  animationDuration={1500}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Case Load by Priority</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsDataByPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar 
                  dataKey="value" 
                  fill="#f59e0b" 
                  animationDuration={1500}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
