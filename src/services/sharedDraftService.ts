import { Language } from '../i18n/translations';

export type DraftAccessLevel = 'view_and_comment' | 'view_only' | 'co_edit';

export type ReviewerRole =
  | 'Advocate'
  | 'Judge'
  | 'Legal Scholar'
  | 'Associate'
  | 'Paralegal'
  | 'Client'
  | 'Public Prosecutor';

export interface SharedDraftComment {
  id: string;
  authorName: string;
  authorRole: ReviewerRole;
  selectedText?: string;
  startIndex?: number;
  endIndex?: number;
  commentText: string;
  suggestedRevision?: string;
  statutoryReference?: string;
  status: 'open' | 'resolved' | 'applied';
  createdAt: string;
  likes?: number;
}

export interface DraftCollaborator {
  id: string;
  name: string;
  role: ReviewerRole;
  lastActiveAt: string;
  color: string;
}

export interface SharedDraft {
  id: string;
  shareToken: string;
  title: string;
  content: string;
  originalAuthor: string;
  authorRole: ReviewerRole;
  taskType?: string;
  accessLevel: DraftAccessLevel;
  passcode?: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  comments: SharedDraftComment[];
  activeCollaborators?: DraftCollaborator[];
  isLocked?: boolean;
}

export interface CreateSharedDraftOptions {
  title: string;
  content: string;
  authorName: string;
  authorRole?: ReviewerRole;
  accessLevel?: DraftAccessLevel;
  passcode?: string;
  expiryDays?: number; // 1, 7, 30, or null for no expiry
  taskType?: string;
}

const STORAGE_KEY_PREFIX = 'seera_shared_draft_';

// Random secure token generator (16 chars alphanumeric)
export function generateSecureToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'srd_';
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      token += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return token;
}

/**
 * Creates and publishes a shared draft with unique access-controlled token
 */
export async function createSharedDraft(
  options: CreateSharedDraftOptions
): Promise<{ draft: SharedDraft; shareUrl: string }> {
  const shareToken = generateSecureToken();
  const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  
  let expiresAt: string | null = null;
  if (options.expiryDays && options.expiryDays > 0) {
    const expDate = new Date(now.getTime() + options.expiryDays * 24 * 60 * 60 * 1000);
    expiresAt = expDate.toISOString();
  }

  const newDraft: SharedDraft = {
    id: draftId,
    shareToken,
    title: options.title.trim() || 'Sanada Seeraa (Legal Draft)',
    content: options.content,
    originalAuthor: options.authorName.trim() || 'Advocate',
    authorRole: options.authorRole || 'Advocate',
    taskType: options.taskType || 'contract',
    accessLevel: options.accessLevel || 'view_and_comment',
    passcode: options.passcode?.trim() || undefined,
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    viewsCount: 1,
    comments: [],
    activeCollaborators: [
      {
        id: 'author',
        name: options.authorName.trim() || 'Advocate',
        role: options.authorRole || 'Advocate',
        lastActiveAt: now.toISOString(),
        color: '#f59e0b',
      },
    ],
  };

  // 1. Try server persistence
  try {
    const res = await fetch('/api/drafts/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDraft),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.draft) {
        newDraft.id = data.draft.id || newDraft.id;
      }
    }
  } catch (err) {
    console.warn('Server draft share notice (using local fallback store):', err);
  }

  // 2. Cache in localStorage for immediate offline/local access
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${shareToken}`, JSON.stringify(newDraft));
    // Also save in user's created drafts index
    const myDraftsRaw = localStorage.getItem('seera_my_shared_tokens') || '[]';
    const myTokens: string[] = JSON.parse(myDraftsRaw);
    if (!myTokens.includes(shareToken)) {
      myTokens.unshift(shareToken);
      localStorage.setItem('seera_my_shared_tokens', JSON.stringify(myTokens.slice(0, 50)));
    }
  } catch (storageErr) {
    console.warn('LocalStorage draft cache error:', storageErr);
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.saorethio1.com';
  const shareUrl = `${baseUrl}/?draftToken=${shareToken}`;

  return { draft: newDraft, shareUrl };
}

/**
 * Fetches a shared draft by its unique access token
 */
export async function getSharedDraftByToken(
  token: string,
  passcodeAttempt?: string
): Promise<{ draft: SharedDraft | null; error?: string; isPasswordProtected?: boolean }> {
  if (!token) return { draft: null, error: 'Token is required' };

  // 1. Try backend API first for live multi-user sync
  try {
    const query = passcodeAttempt ? `?passcode=${encodeURIComponent(passcodeAttempt)}` : '';
    const res = await fetch(`/api/drafts/${encodeURIComponent(token)}${query}`);
    if (res.ok) {
      const data = await res.json();
      if (data.draft) {
        // Cache locally
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(data.draft));
        } catch {}
        return { draft: data.draft };
      }
    } else if (res.status === 401) {
      return { draft: null, isPasswordProtected: true, error: 'Passcode required' };
    } else if (res.status === 410) {
      return { draft: null, error: 'This draft share link has expired' };
    }
  } catch (err) {
    console.warn('API fetch draft error, falling back to local storage:', err);
  }

  // 2. Fallback to localStorage
  try {
    const localRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${token}`);
    if (localRaw) {
      const draft: SharedDraft = JSON.parse(localRaw);

      // Check expiry
      if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
        return { draft: null, error: 'This draft share link has expired' };
      }

      // Check passcode
      if (draft.passcode) {
        if (!passcodeAttempt) {
          return { draft: null, isPasswordProtected: true, error: 'Passcode required' };
        }
        if (draft.passcode !== passcodeAttempt) {
          return { draft: null, isPasswordProtected: true, error: 'Incorrect passcode' };
        }
      }

      draft.viewsCount = (draft.viewsCount || 0) + 1;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(draft));
      return { draft };
    }
  } catch (e) {
    console.error('Error reading local draft:', e);
  }

  return { draft: null, error: 'Draft not found or access link is invalid' };
}

/**
 * Adds a new comment to a shared draft simultaneously
 */
export async function addCommentToSharedDraft(
  token: string,
  commentData: {
    authorName: string;
    authorRole: ReviewerRole;
    selectedText?: string;
    startIndex?: number;
    endIndex?: number;
    commentText: string;
    suggestedRevision?: string;
    statutoryReference?: string;
  }
): Promise<{ success: boolean; comment: SharedDraftComment; updatedDraft?: SharedDraft }> {
  const newComment: SharedDraftComment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    authorName: commentData.authorName.trim() || 'Reviewer',
    authorRole: commentData.authorRole || 'Advocate',
    selectedText: commentData.selectedText,
    startIndex: commentData.startIndex,
    endIndex: commentData.endIndex,
    commentText: commentData.commentText.trim(),
    suggestedRevision: commentData.suggestedRevision?.trim() || undefined,
    statutoryReference: commentData.statutoryReference?.trim() || undefined,
    status: 'open',
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  // 1. Try server update
  try {
    const res = await fetch(`/api/drafts/${encodeURIComponent(token)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.updatedDraft) {
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(data.updatedDraft));
        } catch {}
        return { success: true, comment: newComment, updatedDraft: data.updatedDraft };
      }
    }
  } catch (err) {
    console.warn('Server comment add notice:', err);
  }

  // 2. Fallback to localStorage
  try {
    const localRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${token}`);
    if (localRaw) {
      const draft: SharedDraft = JSON.parse(localRaw);
      draft.comments = draft.comments || [];
      draft.comments.push(newComment);
      draft.updatedAt = new Date().toISOString();
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(draft));
      return { success: true, comment: newComment, updatedDraft: draft };
    }
  } catch (e) {
    console.error('Local comment add error:', e);
  }

  return { success: true, comment: newComment };
}

/**
 * Toggles comment resolution status (open <-> resolved)
 */
export async function toggleCommentResolution(
  token: string,
  commentId: string,
  newStatus: 'open' | 'resolved' | 'applied'
): Promise<boolean> {
  // 1. Server call
  try {
    await fetch(`/api/drafts/${encodeURIComponent(token)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch {}

  // 2. Local update
  try {
    const localRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${token}`);
    if (localRaw) {
      const draft: SharedDraft = JSON.parse(localRaw);
      const c = draft.comments?.find((item) => item.id === commentId);
      if (c) {
        c.status = newStatus;
        draft.updatedAt = new Date().toISOString();
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(draft));
      }
      return true;
    }
  } catch {}

  return true;
}

/**
 * Applies a suggested revision to the shared draft text directly
 */
export async function applyRevisionToDraft(
  token: string,
  commentId: string,
  replacementText: string,
  targetText?: string
): Promise<{ success: boolean; updatedContent: string }> {
  let updatedContent = '';

  // 1. Server call
  try {
    const res = await fetch(`/api/drafts/${encodeURIComponent(token)}/apply-revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, replacementText, targetText }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.updatedContent) {
        updatedContent = data.updatedContent;
      }
    }
  } catch {}

  // 2. Local update
  try {
    const localRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${token}`);
    if (localRaw) {
      const draft: SharedDraft = JSON.parse(localRaw);
      if (!updatedContent) {
        if (targetText && draft.content.includes(targetText)) {
          draft.content = draft.content.replace(targetText, replacementText);
        } else {
          draft.content = `${draft.content}\n\n[Fooyya'iinsa Dabalame / Revision Applied]:\n${replacementText}`;
        }
        updatedContent = draft.content;
      } else {
        draft.content = updatedContent;
      }

      const c = draft.comments?.find((item) => item.id === commentId);
      if (c) {
        c.status = 'applied';
      }
      draft.updatedAt = new Date().toISOString();
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${token}`, JSON.stringify(draft));
    }
  } catch {}

  return { success: true, updatedContent };
}

/**
 * Emits heartbeat / presence to show simultaneous reviewers
 */
export async function sendCollaboratorPresence(
  token: string,
  collaborator: { name: string; role: ReviewerRole }
): Promise<DraftCollaborator[]> {
  try {
    const res = await fetch(`/api/drafts/${encodeURIComponent(token)}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collaborator),
    });
    if (res.ok) {
      const data = await res.json();
      return data.activeCollaborators || [];
    }
  } catch {}

  return [
    {
      id: 'local_user',
      name: collaborator.name,
      role: collaborator.role,
      lastActiveAt: new Date().toISOString(),
      color: '#10b981',
    },
  ];
}
