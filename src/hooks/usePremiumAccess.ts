import { useAuth } from '../context/AuthContext';
import { isOwnerAccount } from '../services/ownerAuth';
import { getStoredOwnerKey } from '../services/referralTracking';

export interface PremiumAccessResult {
  isPremiumSubscriber: boolean;
  userRole: string;
  isOwner: boolean;
  canAccessFeature: (featureKey?: string) => boolean;
  upgradeToPremium: () => Promise<void>;
}

/**
 * Custom hook to verify if the current user has a verified 'premium' role
 * in their Firestore user profile.
 * 
 * Strict condition:
 * - Only users with `role: 'premium'` (or 'admin' / platform owner) are granted access.
 * - Non-premium users will have `isPremiumSubscriber: false`.
 */
export function usePremiumAccess(): PremiumAccessResult {
  const { user, profile, updateProfile } = useAuth();

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  // Strictly check Firestore user profile role
  const firestoreRole = profile?.role;
  const isFirestorePremium = 
    firestoreRole === 'premium' || 
    firestoreRole === 'admin' ||
    profile?.subscriptionTier === 'premium' ||
    (profile?.isPremium === true && firestoreRole !== 'free' && firestoreRole !== 'standard');

  const isPremiumSubscriber = Boolean(isOwner || isFirestorePremium);

  const canAccessFeature = (_featureKey?: string): boolean => {
    return isPremiumSubscriber;
  };

  const upgradeToPremium = async (): Promise<void> => {
    if (!updateProfile) return;
    try {
      await updateProfile({
        role: 'premium',
        subscriptionTier: 'premium',
        isPremium: true,
        subscriptionPlan: 'unlimited',
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('seera_is_premium', 'true');
        localStorage.setItem('seera_user_role', 'premium');
      }
      window.dispatchEvent(new CustomEvent('seera_premium_updated'));
    } catch (err) {
      console.error('Failed to upgrade user to premium in Firestore:', err);
      throw err;
    }
  };

  return {
    isPremiumSubscriber,
    userRole: firestoreRole || (isOwner ? 'owner' : 'standard'),
    isOwner,
    canAccessFeature,
    upgradeToPremium,
  };
}
