import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface AssignCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  institutionId: string;
}

export const AssignCaseModal: React.FC<AssignCaseModalProps> = ({ isOpen, onClose, caseId, institutionId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        const q = query(collection(db, 'court_users'), where('institutionId', '==', institutionId));
        const snapshot = await getDocs(q);
        const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(userData);
      };
      fetchUsers();
    }
  }, [isOpen, institutionId]);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsAssigning(true);
    try {
      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, { assignedJudge: selectedUserId });
      
      // Log action
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'CASE_ASSIGNMENT',
        institutionId: institutionId,
        targetId: caseId,
        performedBy: user?.uid || 'unknown_admin',
        details: `Case assigned to user: ${selectedUserId}`,
        timestamp: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error('Assignment error:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 w-96 space-y-4">
        <h2 className="text-xl font-bold text-white">Assign Case</h2>
        <select 
          className="w-full p-3 rounded-xl bg-slate-950 text-white"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Select a user</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
        </select>
        <button 
          onClick={handleAssign} 
          disabled={isAssigning || !selectedUserId}
          className="w-full p-3 bg-amber-500 rounded-xl font-bold text-slate-900"
        >
          {isAssigning ? 'Assigning...' : 'Assign'}
        </button>
        <button onClick={onClose} className="w-full p-2 text-slate-400">Cancel</button>
      </div>
    </div>
  );
};
