import React, { useState } from 'react';
import { AssignCaseModal } from '../components/AssignCaseModal';
import { AdminAuditLog } from '../components/AdminAuditLog';
import { useAuth } from '../context/AuthContext';
import { seedGurbichaStaff } from '../scripts/seedGurbichaStaff';
import { Users, Database } from 'lucide-react';
import { Language } from '../i18n/translations';

export const CourtroomControlView: React.FC<{ currentLang?: Language }> = () => {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { profile, user } = useAuth();
  
  const institutionId = (profile as any)?.courtId || (profile as any)?.institutionId || 'court_gurbicha_001';
  const isOwner = user?.email === 'ayeledha@gmail.com';


  const handleSeed = async () => {
    setIsSeeding(true);
    await seedGurbichaStaff();
    setIsSeeding(false);
    alert('Gurbicha staff seeded successfully!');
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-serif-legal">Administrative Control</h1>
          <p className="text-slate-400 text-sm">Managing {profile?.licenseOrInstitution || 'Court Institution'}</p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <button 
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Seeding...' : 'Seed Gurbicha Staff'}
            </button>
          )}
          <button 
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Users className="w-4 h-4" />
            Assign Case
          </button>
        </div>
      </div>
      
      <AdminAuditLog institutionId={institutionId} />
      
      {showAssignModal && (
        <AssignCaseModal 
          isOpen={showAssignModal} 
          onClose={() => setShowAssignModal(false)}
          caseId="example_case_123"
          institutionId={institutionId}
        />
      )}
    </div>
  );
};
