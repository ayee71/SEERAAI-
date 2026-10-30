import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLogEntry {
  actionType: string;
  institutionId?: string;
  institutionName?: string;
  targetId?: string;
  performedBy: string;
  details: string;
  timestamp: any;
}

export const logAuditAction = async (
  actionType: string,
  performedBy: string,
  details: string,
  institutionId?: string,
  institutionName?: string,
  targetId?: string
) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      actionType,
      performedBy,
      details,
      institutionId: institutionId || null,
      institutionName: institutionName || null,
      targetId: targetId || null,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
