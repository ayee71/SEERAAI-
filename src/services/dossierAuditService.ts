import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface DossierAuditRecord {
  id?: string;
  userId: string;
  courtName: string;
  fileName: string;
  content: string;
  auditResult: string;
  createdAt: any;
}

export const saveDossierAudit = async (userId: string, audit: Omit<DossierAuditRecord, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'dossier_audits'), {
      ...audit,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving dossier audit:', error);
    throw error;
  }
};

export const getDossierAuditHistory = async (userId: string, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'dossier_audits'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DossierAuditRecord[];
  } catch (error) {
    console.error('Error getting dossier audit history:', error);
    throw error;
  }
};
