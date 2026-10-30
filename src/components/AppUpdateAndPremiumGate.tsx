import React from 'react';
import { Language } from '../i18n/translations';

interface AppUpdateAndPremiumGateProps {
  currentLang: Language;
  isOwner: boolean;
  onUpdateCompleted: () => void;
  onActivatePremium: (code: string) => boolean;
  onNavigateToPayment: () => void;
}

export const AppUpdateAndPremiumGate: React.FC<AppUpdateAndPremiumGateProps> = () => {
  // Premium subscription is 100% optional. Never block any user or shared link visit.
  return null;
};
