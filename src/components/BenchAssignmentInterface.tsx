import React, { useState } from 'react';
import { autoAssignBench } from '../services/courtInstitutionService';
import { CaseType } from '../data/courts/courtBenches';

interface BenchAssignmentInterfaceProps {
  courtLevel: string;
  onConfirm: (bench: string) => void;
}

export const BenchAssignmentInterface: React.FC<BenchAssignmentInterfaceProps> = ({ courtLevel, onConfirm }) => {
  const [caseType, setCaseType] = useState<CaseType>('Criminal');
  const [assignedBench, setAssignedBench] = useState<string>('');

  const handleAutoAssign = () => {
    const bench = autoAssignBench(courtLevel, caseType);
    setAssignedBench(bench || '');
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-white mb-3">Assign Bench</h3>
      <select 
        value={caseType} 
        onChange={(e) => setCaseType(e.target.value as CaseType)}
        className="bg-slate-800 text-white p-2 rounded w-full mb-3 text-xs"
      >
        <option value="Criminal">Criminal</option>
        <option value="Civil">Civil</option>
        <option value="Family">Family</option>
        <option value="Commercial">Commercial</option>
        <option value="Labor">Labor</option>
        <option value="Land">Land</option>
        <option value="Administrative">Administrative</option>
        <option value="Constitutional">Constitutional</option>
      </select>
      <button 
        onClick={handleAutoAssign}
        className="bg-blue-600 text-white text-xs p-2 rounded w-full mb-2"
      >
        Auto-Assign Bench
      </button>
      {assignedBench && (
        <div className="mt-3">
          <p className="text-xs text-slate-300 mb-2">Recommended: <span className="font-bold text-amber-400">{assignedBench}</span></p>
          <button 
            onClick={() => onConfirm(assignedBench)}
            className="bg-green-600 text-white text-xs p-2 rounded w-full"
          >
            Confirm Assignment
          </button>
        </div>
      )}
    </div>
  );
};
