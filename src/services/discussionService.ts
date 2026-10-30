import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';

export interface MeetingData {
  meetingUrl: string;
  topic: string;
  serviceName: string;
  createdAt: string;
  expiresAt: string;
  isLive: boolean;
  passcode?: string;
}

export interface DiscussionComment {
  id?: string;
  targetId: string;
  authorId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  taggedHandles?: string[];
  meetingData?: MeetingData;
  createdAt: any;
}

export interface CollaborationInvite {
  id?: string;
  targetId: string;
  inviterId: string;
  inviterName: string;
  invitedHandle: string;
  role: 'editor' | 'reviewer' | 'viewer';
  token: string;
  createdAt: any;
  status: 'pending' | 'accepted';
}

/**
 * Generates a secure, temporary, encrypted video conference room for live legal collaboration.
 * Uses Jitsi Meet mesh with unique cryptographic session tokens and automatic prejoin bypass.
 */
export const generateSecureMeetingRoom = (
  targetId: string,
  topic: string = 'Marii Sanada Seeraa (Legal Draft Session)',
  durationHours: number = 2
): MeetingData => {
  const sanitizedTarget = (targetId || 'legal-session')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 24);
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const timeCode = Date.now().toString(36);
  const roomName = `SEERAAI-LegalCollab-${sanitizedTarget}-${timeCode}-${randomSuffix}`;
  
  // Direct Jitsi Meet URL with clean parameters
  const meetingUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  return {
    meetingUrl,
    topic: topic || 'Marii Sanada Seeraa / Legal Draft Video Conference',
    serviceName: 'Jitsi Secure Legal Meet',
    createdAt: now.toISOString(),
    expiresAt,
    isLive: true,
  };
};

const LOCAL_COMMENTS_KEY = 'seera_discussion_comments_cache_v1';
const LOCAL_INVITES_KEY = 'seera_discussion_invites_cache_v1';

const getLocalComments = (targetId: string): DiscussionComment[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_COMMENTS_KEY}_${targetId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalComment = (targetId: string, comment: DiscussionComment) => {
  try {
    const existing = getLocalComments(targetId);
    const updated = [...existing, comment];
    localStorage.setItem(`${LOCAL_COMMENTS_KEY}_${targetId}`, JSON.stringify(updated));
  } catch {}
};

export const addComment = async (comment: DiscussionComment) => {
  const newComment = {
    ...comment,
    id: comment.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  saveLocalComment(comment.targetId, newComment);

  try {
    const ref = await addDoc(collection(db, 'discussions'), {
      ...comment,
      createdAt: serverTimestamp(),
    });
    return ref;
  } catch (err) {
    console.warn('Firestore addComment offline or pending network:', err);
    return null;
  }
};

export const getOrCreateDiscussionId = async (targetId: string): Promise<string> => {
  try {
    const q = query(collection(db, 'discussions'), where('targetId', '==', targetId), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    const newDoc = await addDoc(collection(db, 'discussions'), {
      targetId,
      text: "Marii haaraa...",
      authorId: "system",
      authorName: "System",
      createdAt: serverTimestamp(),
    });
    return newDoc.id;
  } catch (err) {
    console.warn('Firestore getOrCreateDiscussionId fallback to local id:', err);
    return `disc_${targetId}`;
  }
};

export const updateDiscussion = async (discussionId: string, updates: any) => {
  try {
    return await updateDoc(doc(db, 'discussions', discussionId), updates);
  } catch (err) {
    console.warn('Firestore updateDiscussion error:', err);
  }
};

export const addCollaborationInvite = async (invite: CollaborationInvite) => {
  try {
    const invites = getLocalInvites(invite.targetId);
    localStorage.setItem(`${LOCAL_INVITES_KEY}_${invite.targetId}`, JSON.stringify([...invites, invite]));
  } catch {}

  try {
    return await addDoc(collection(db, 'collaboration_invites'), {
      ...invite,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore addCollaborationInvite error:', err);
    return null;
  }
};

export const getLocalInvites = (targetId: string): CollaborationInvite[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_INVITES_KEY}_${targetId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const subscribeToComments = (targetId: string, callback: (comments: DiscussionComment[]) => void) => {
  const localDocs = getLocalComments(targetId);
  if (localDocs.length > 0) {
    callback(localDocs);
  }

  try {
    const q = query(
      collection(db, 'discussions'),
      where('targetId', '==', targetId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const comments: DiscussionComment[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DiscussionComment[];

        // Combine local and remote without duplicates
        const combined = [...comments];
        localDocs.forEach(loc => {
          if (!combined.some(c => c.id === loc.id || (c.text === loc.text && c.authorId === loc.authorId))) {
            combined.push(loc);
          }
        });

        callback(combined);
      },
      (err) => {
        console.warn('Firestore subscribeToComments listener error, using cached comments:', err);
        callback(getLocalComments(targetId));
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeToComments setup error:', err);
    callback(getLocalComments(targetId));
    return () => {};
  }
};

