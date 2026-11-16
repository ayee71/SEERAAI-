import React, { useState } from 'react';
import { Users, ShieldCheck, UserCog, Settings, Plus } from 'lucide-react';
import { Language } from '../i18n/translations';

interface AdminPanelProps {
  currentLang: Language;
}

export const AdminPanelManagement: React.FC<AdminPanelProps> = ({ currentLang }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roles' | 'staff' | 'settings'>('dashboard');

  return (
    <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
      <div className="flex space-x-4 border-b border-slate-800 pb-4">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-amber-500 font-bold' : 'text-slate-400'}>Dashboard</button>
        <button onClick={() => setActiveTab('roles')} className={activeTab === 'roles' ? 'text-amber-500 font-bold' : 'text-slate-400'}>Roles & Permissions</button>
        <button onClick={() => setActiveTab('staff')} className={activeTab === 'staff' ? 'text-amber-500 font-bold' : 'text-slate-400'}>Internal Staff</button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'text-amber-500 font-bold' : 'text-slate-400'}>Settings</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm text-slate-400">Total Users</h3>
            <p className="text-2xl font-bold text-white">150</p>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm text-slate-400">Total External Users</h3>
            <p className="text-2xl font-bold text-white">100</p>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm text-slate-400">Total Staffs</h3>
            <p className="text-2xl font-bold text-white">50</p>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm text-slate-400">System Roles</h3>
            <p className="text-2xl font-bold text-white">10</p>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-sm text-slate-400">Available Permissions</h3>
            <p className="text-2xl font-bold text-white">25</p>
          </div>
        </div>
      )}

      {activeTab === 'roles' && <div className="text-white">Roles & Permissions Management</div>}
      {activeTab === 'staff' && <div className="text-white">Internal Staff/User Management</div>}
      {activeTab === 'settings' && <div className="text-white">Profile & App Settings</div>}
    </div>
  );
};
