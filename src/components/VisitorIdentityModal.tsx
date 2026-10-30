import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { logRealtimeEvent } from '../services/realtimeTracker';
import { SeeraAILogo } from './SeeraAILogo';
import { 
  isBiometricAvailable, 
  getBiometricEnrollmentStatus, 
  BiometricEnrollment 
} from '../utils/biometric';
import { isOwnerEmail, isOwnerUsername, isOwnerKey, unlockOwnerPrivileges } from '../services/ownerAuth';

interface VisitorIdentityModalProps {
  currentLang: Language;
  onIdentify: (name: string, role?: string) => void;
  referralCreator?: string | null;
}

export const VisitorIdentityModal: React.FC<VisitorIdentityModalProps> = ({
  currentLang,
  onIdentify,
  referralCreator,
}) => {
  const { 
    user, 
    profile, 
    updateProfile, 
    signInWithEmail, 
    signUpWithEmail, 
    resetPassword, 
    signIn,
    signInWithBiometrics,
    enrollBiometrics,
    isBiometricEnrolled
  } = useAuth();
  const [authMode, setAuthMode] = useState<'biometric' | 'username_signup' | 'username_login' | 'quick_link' | 'forgot_password'>('biometric');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [name, setName] = useState('');
  const [legalRole, setLegalRole] = useState<string>('advocate');
  const [isNotLegal, setIsNotLegal] = useState<boolean>(false);
  const [institution, setInstitution] = useState('');
  const [facebookLink, setFacebookLink] = useState(profile?.facebookLink || '');
  const [telegramLink, setTelegramLink] = useState(profile?.telegramLink || '');
  const [linkedinLink, setLinkedinLink] = useState(profile?.linkedinLink || '');
  const [acceptedOath, setAcceptedOath] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [accessDeniedModal, setAccessDeniedModal] = useState(false);

  // Biometric authentication state
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState<string>('');
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [biometricEnrollment, setBiometricEnrollment] = useState<BiometricEnrollment | null>(null);
  const [hasHardwareBiometrics, setHasHardwareBiometrics] = useState<boolean>(true);

  useEffect(() => {
    isBiometricAvailable().then((avail) => setHasHardwareBiometrics(avail));
    const status = getBiometricEnrollmentStatus();
    setBiometricEnrollment(status);
  }, []);

  // If user is already signed in
  useEffect(() => {
    if (user && !name) {
      setName(user.displayName || '');
    }
  }, [user]);

  const handleBiometricAuth = async () => {
    setError('');
    setBiometricFeedback('');
    setBiometricScanning(true);

    try {
      const targetEmail = accountUsername.trim() || user?.email || undefined;
      const result = await signInWithBiometrics(targetEmail);

      if (result.success && result.userEmail) {
        setBiometricSuccess(true);
        const resolvedName = result.userName || name || result.userEmail.split('@')[0] || 'Ogeessa Seeraa';

        await updateProfile({
          isLegalProfessional: true,
          legalRole: legalRole as any,
          biometricEnabled: true,
          biometricMethod: result.authMethod,
          verifiedAt: new Date().toISOString(),
        });

        await logRealtimeEvent(
          'visit',
          `Biometric Access (${result.authMethod.toUpperCase()}): ${resolvedName} seeneera`,
          'Biometric Gatekeeper',
          referralCreator || 'Biometric Touch',
          resolvedName
        );

        setTimeout(() => {
          onIdentify(resolvedName, legalRole);
        }, 500);
      } else {
        setError(
          result.error ||
          (currentLang === 'om'
            ? 'Asxaa qubaa/FaceID mirkaneessuun hin danda\'amne. Maaloo irra deebi\'aa yaalaa.'
            : 'የጣት አሻራ ወይም FaceID ማረጋገጥ አልተሳካም። እባክዎ እንደገና ይሞክሩ።')
        );
      }
    } catch (err: any) {
      console.warn('Biometric auth error:', err);
      setError(
        currentLang === 'om'
          ? 'Dogoggora sirna biometric. Maaloo irra deebisaa yaalaa.'
          : 'የባዮሜትሪክ ማረጋገጫ ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።'
      );
    } finally {
      setBiometricScanning(false);
    }
  };

  const handleEnrollDevicePasskey = async () => {
    setError('');
    const targetEmail = accountUsername.trim() || user?.email || 'advocate@seeraai.et';
    const displayName = name.trim() || 'Ogeessa Seeraa';
    setIsVerifying(true);

    try {
      const res = await enrollBiometrics(targetEmail, displayName);
      if (res.success) {
        setBiometricFeedback(
          currentLang === 'om'
            ? '✓ Asxaa qubaa/FaceID meeshaa kanaan milkiidhaan galmaa\'eera!'
            : '✓ የጣት አሻራ/FaceID በዚህ መሳሪያ ላይ በተሳካ ሁኔታ ተመዝግቧል!'
        );
        const enrolled = getBiometricEnrollmentStatus();
        setBiometricEnrollment(enrolled);
      } else {
        setError(res.error || 'Enrollment error');
      }
    } catch (err: any) {
      setError(err?.message || 'Biometric enrollment error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUsernameSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawInput = accountUsername.trim().toLowerCase().replace(/\s+/g, '');
    let cleanUsername = rawInput;

    if (!rawInput.includes('@')) {
      cleanUsername = rawInput.replace(/[^a-z0-9._-]/g, '');
      if (!cleanUsername || cleanUsername.length < 3) {
        setError(
          currentLang === 'om'
            ? 'Maaloo Username gahaa ta\'e galchaa (fkn: user@example.com ykn abukaattoo1, qubee 3+).'
            : 'እባክዎ ትክክለኛ የተጠቃሚ ስም (Username) ያስገቡ (ምሳሌ: lawyer1)'
        );
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawInput)) {
        setError(
          currentLang === 'om'
            ? 'Maaloo Email dhuunfaa sirrii ta\'e galchaa.'
            : 'እባክዎ ትክክለኛ የግል ኢሜይል ያስገቡ።'
        );
        return;
      }
    }

    const isOwnerTarget = isOwnerEmail(cleanUsername) || isOwnerUsername(cleanUsername);
    if (isOwnerTarget) {
      if (accountPassword && isOwnerKey(accountPassword)) {
        unlockOwnerPrivileges(cleanUsername);
        onIdentify('Ayele Be Dha', 'SuperAdmin');
        return;
      }
      setError(
        currentLang === 'om'
          ? 'Email/Username kun kan abbaa appiiti. Yoo abbaa taatan PIN (2026) galchaatii seenaa.'
          : 'ይህ የባለቤቱ መለያ ነው። ባለቤት ከሆኑ ፒን ቁጥር (2026) በማስገባት ይግቡ።'
      );
      return;
    }

    if (!accountPassword || accountPassword.length < 6) {
      setError(
        currentLang === 'om'
          ? 'Password jechoota/lakk. 6 yoo xiqqaate ta\'uu qaba.'
          : 'የይለፍ ቃል (Password)ቢያንስ 6 ቁምፊዎች መሆን አለበት።'
      );
      return;
    }

    if (!acceptedOath) {
      setError(
        currentLang === 'om'
          ? 'Maaloo ogeessa seeraa ta\'uu keessan mirkaneessaa (kakuu mallatteessaa).'
          : 'እባክዎ የህግ ባለሙያ መሆንዎን የሚያረጋግጡበትን መሃላ ያረጋግጡ።'
      );
      return;
    }

    setIsVerifying(true);
    const displayNameToUse = name.trim() || (cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername);

    try {
      // 1. Create account with Firebase Auth using username or email
      await signUpWithEmail(cleanUsername, accountPassword, displayNameToUse);

      // 2. Update Firestore User Settings Profile
      await updateProfile({
        appUsername: cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername,
        visitorName: displayNameToUse,
        isLegalProfessional: true,
        legalRole: legalRole as any,
        licenseOrInstitution: institution.trim() || 'Ogeessa Seeraa Mirkanaa\'e',
        facebookLink: facebookLink.trim(),
        telegramLink: telegramLink.trim(),
        linkedinLink: linkedinLink.trim(),
        verifiedAt: new Date().toISOString(),
      });

      // 3. Log real-time event
      await logRealtimeEvent(
        'visit',
        `Account Banatame (${cleanUsername}): ${displayNameToUse} (${legalRole}) seeneera`,
        'Username Gatekeeper',
        referralCreator || 'Direct Registration',
        displayNameToUse
      );

      onIdentify(displayNameToUse, legalRole);
    } catch (err: any) {
      console.warn('Username/Email sign up details:', err);
      const errMsg = err?.message || err?.code || '';
      if (errMsg.includes('email-already-in-use') || errMsg.includes('already-exists') || errMsg.includes('auth/email-already-in-use')) {
        setError(
          currentLang === 'om'
            ? `Username/Email '${cleanUsername}' kun duraan galmaa'eera! Maaloo 'Username ykn Email'n Seeni' irratti cuqaasaa.`
            : `የተጠቃሚ ስም/ኢሜይል '${cleanUsername}' አስቀድሞ ተመዝግቧል። እባክዎ ይግቡ።`
        );
      } else if (errMsg.includes('operation-not-allowed') || errMsg.includes('auth/operation-not-allowed')) {
        setError(
          currentLang === 'om'
            ? '⚠️ Maaloo, tajaajilli Username & Password Firebase Console keessan irratti hin banamne. Maaloo gara Firebase Console deemanii Sign-in Method "Email/Password" "Enable" godhaa.'
            : '⚠️ እባክዎ የኢሜይል እና የይለፍ ቃል አገልግሎት በFirebase ኮንሶልዎ ውስጥ አልተፈቀደም። እባክዎ በኮንሶልዎ ውስጥ "Email/Password" መግቢያን ያግብሩ (Enable ያድርጉ)።'
        );
      } else if (errMsg.includes('weak-password')) {
        setError(
          currentLang === 'om'
            ? 'Password keessan cimaa miti. Maaloo lakk. fi qubeewwan makin.'
            : 'የይለፍ ቃልዎ ጠንካራ አይደለም።'
        );
      } else {
        setError(
          currentLang === 'om'
            ? 'Account banuun hin milkoofne. Maaloo irra deebi\'aa yaalaa.'
            : 'አካውንት መፍጠር አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = accountUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setError(
        currentLang === 'om'
          ? 'Maaloo Username ykn Email keessan galchaa.'
          : 'እባክዎ የተጠቃሚ ስም ወይም ኢሜይል ያስገቡ።'
      );
      return;
    }

    const isOwnerTarget = isOwnerEmail(cleanUsername) || isOwnerUsername(cleanUsername);
    if (isOwnerTarget) {
      if (accountPassword && isOwnerKey(accountPassword)) {
        unlockOwnerPrivileges(cleanUsername);
        onIdentify('Ayele Be Dha', 'SuperAdmin');
        return;
      }
      setError(
        currentLang === 'om'
          ? 'Email/Username kun kan abbaa appiiti. Yoo abbaa taatan PIN (2026) galchaatii seenaa.'
          : 'ይህ የባለቤቱ መለያ ነው። ባለቤት ከሆኑ ፒን ቁጥር (2026) በማስገባት ይግቡ።'
      );
      return;
    }

    if (!accountPassword) {
      setError(
        currentLang === 'om'
          ? 'Maaloo Password keessan galchaa.'
          : 'እባክዎ የይለፍ ቃል ያስገቡ።'
      );
      return;
    }

    setIsVerifying(true);

    try {
      await signInWithEmail(cleanUsername, accountPassword);

      // Post-login verification setup
      await updateProfile({
        isLegalProfessional: true,
        legalRole: legalRole as any,
        verifiedAt: new Date().toISOString(),
      });

      const loggedName = profile?.visitorName || cleanUsername;
      await logRealtimeEvent(
        'visit',
        `Username'n Seene: ${loggedName} (${cleanUsername})`,
        'Username Login',
        referralCreator || 'Direct Login',
        loggedName
      );

      onIdentify(loggedName, legalRole);
    } catch (err: any) {
      console.warn('Username login details:', err);
      const errMsg = err?.message || err?.code || '';
      if (errMsg.includes('operation-not-allowed') || errMsg.includes('auth/operation-not-allowed')) {
        setError(
          currentLang === 'om'
            ? '⚠️ Maaloo, tajaajilli Username & Password Firebase Console keessan irratti hin banamne. Maaloo gara Firebase Console deemanii Sign-in Method "Email/Password" "Enable" godhaa.'
            : '⚠️ እባክዎ የኢሜይል እና የይለፍ ቃል አገልግሎት በFirebase ኮንሶልዎ ውስጥ አልተፈቀደም። እባክዎ በኮንሶልዎ ውስጥ "Email/Password" መግቢያን ያግብሩ (Enable ያድርጉ)።'
        );
      } else {
        setError(
          currentLang === 'om'
            ? 'Username ykn Password keessan dogoggora. Maaloo sirriitti deebisaa yaalaa.'
            : 'የተጠቃሚ ስም ወይም የይለፍ ቃል የተሳሳተ ነው።'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess(false);

    const input = resetEmail.trim();
    if (!input) {
      setError(
        currentLang === 'om'
          ? 'Maaloo Email ykn Username keessan galchaa.'
          : 'እባክዎ ኢሜይል ወይም የተጠቃሚ ስም ያስገቡ።'
      );
      return;
    }

    setIsVerifying(true);
    try {
      await resetPassword(input);
      setResetSuccess(true);
    } catch (err: any) {
      console.warn('Password reset request error info:', err);
      const msg = err?.message || '';
      if (msg.includes('user-not-found') || msg.includes('invalid-email')) {
        setError(
          currentLang === 'om'
            ? 'Account/Email kun hin argamne. Maaloo irra deebi\'aa sirriitti yaalaa.'
            : 'መለያው አልተገኘም። እባክዎ እንደገና ይሞክሩ።'
        );
      } else {
        setError(
          currentLang === 'om'
            ? 'Linkii erguun hin milkoofne. Maaloo irra deebi\'aa yaalaa.'
            : 'የይለፍ ቃል ዳግም ማስጀመሪያ መላክ አልተሳካም።'
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsVerifying(true);
    setError('');
    try {
      await signIn();
      const googleName = user?.displayName || name || 'Ogeessa Seeraa';
      await updateProfile({
        visitorName: googleName,
        isLegalProfessional: true,
        legalRole: legalRole as any,
        verifiedAt: new Date().toISOString(),
      });
      onIdentify(googleName, legalRole);
    } catch (err) {
      console.warn('Google sign-in user-aborted or issue info:', err);
      setError(
        currentLang === 'om'
          ? 'Google Sign-In hin milkoofne. Maaloo irra deebi\'aa yaalaa.'
          : 'በ Google መግባት አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRoleChange = (role: string) => {
    setLegalRole(role);
    if (role === 'not_legal') {
      setIsNotLegal(true);
      setAccessDeniedModal(true);
    } else {
      setIsNotLegal(false);
      setAccessDeniedModal(false);
      if (error) setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isNotLegal || legalRole === 'not_legal') {
      setAccessDeniedModal(true);
      return;
    }

    const hasName = name.trim().length >= 2;
    const hasTelegram = telegramLink.trim().length >= 3;
    const hasFacebook = facebookLink.trim().length >= 3;
    const hasLinkedIn = linkedinLink.trim().length >= 3;

    // Must provide at least ONE identifier (Username OR Telegram Link/Group OR Facebook Link/Page/Group OR LinkedIn Link)
    if (!hasName && !hasTelegram && !hasFacebook && !hasLinkedIn) {
      setError(
        currentLang === 'om'
          ? 'Maaloo Maqaa, ykn Linkii Telegram (dhuunfaa/group), Facebook (dhuunfaa/page/group), ykn LinkedIn keessaan keessaa yoo xiqqaate tokko galchaa.'
          : 'እባክዎ ስምዎን ወይም የቴሌግራም፣ የፌስቡክ ወይም የሊንክድኢን ሊንክ ያስገቡ።'
      );
      return;
    }

    if (!acceptedOath) {
      setError(
        currentLang === 'om'
          ? 'Maaloo ogeessa seeraa ta\'uu keessan mirkaneessaa (kakuu mallatteessaa).'
          : 'እባክዎ የህግ ባለሙያ መሆንዎን የሚያረጋግጠውን መሃላ ያረጋግጡ።'
      );
      return;
    }

    // Automatically derive a clear visitor display name if name is omitted
    let finalVisitorName = name.trim();
    if (!finalVisitorName) {
      if (hasTelegram) finalVisitorName = `Telegram (${telegramLink.trim().replace(/^https?:\/\/(t\.me\/)?/, '@')})`;
      else if (hasFacebook) finalVisitorName = `Facebook (${facebookLink.trim().replace(/^https?:\/\/(www\.)?facebook\.com\//, '')})`;
      else if (hasLinkedIn) finalVisitorName = `LinkedIn (${linkedinLink.trim().replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')})`;
      else finalVisitorName = 'Ogeessa Seeraa';
    }

    setIsVerifying(true);

    try {
      // Update profile with verified status and networking links
      await updateProfile({
        visitorName: finalVisitorName,
        isLegalProfessional: true,
        legalRole: legalRole as any,
        licenseOrInstitution: institution.trim() || 'Ogeessa Seeraa Mirkanaa\'e',
        facebookLink: facebookLink.trim(),
        telegramLink: telegramLink.trim(),
        linkedinLink: linkedinLink.trim(),
        verifiedAt: new Date().toISOString(),
      });

      // Log real-time visit event (owner Ayele is automatically excluded)
      await logRealtimeEvent(
        'visit',
        `Ogeessa Seeraa (${legalRole}): ${finalVisitorName} seeneera`,
        'Legal Gatekeeper',
        referralCreator || 'Direct Entry',
        finalVisitorName
      );

      onIdentify(finalVisitorName, legalRole);
    } catch (err) {
      console.error('Legal identity verification failed:', err);
      setError(
        currentLang === 'om'
          ? 'Mirkaneessi eenyummaa hin milkoofne. Mee irra deebi\'aa yaalaa.'
          : 'የማረጋገጫ ሂደት አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInstantGuestAccess = async () => {
    setIsVerifying(true);
    try {
      const guestName = referralCreator
        ? `Guest via ${referralCreator}`
        : 'Ogeessa Seeraa (Guest)';
      await updateProfile({
        visitorName: guestName,
        isLegalProfessional: true,
        legalRole: 'advocate',
        verifiedAt: new Date().toISOString(),
      });
      await logRealtimeEvent(
        'visit',
        `Ogeessa Seeraa (Guest): ${guestName} kallattiin seeneera`,
        'Legal Gatekeeper',
        referralCreator || 'Direct Link Entry',
        guestName
      );
      onIdentify(guestName, 'advocate');
    } catch (err) {
      console.error('Guest access failed:', err);
      onIdentify('Ogeessa Seeraa', 'advocate');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-4 overflow-y-auto">
      {/* ACCESS DENIED MODAL (If user is not a legal professional) */}
      {accessDeniedModal ? (
        <div className="relative bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-950 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-3xl">
            🚫
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-red-400 font-serif-legal">
              {currentLang === 'om' ? 'Seensi Dhorkaadha (Access Denied)' : 'መግባት አይፈቀድም (Access Denied)'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentLang === 'om'
                ? 'Appilikeeshiniin kun, qabiyyee fi kuusaan murteewwan dhaddacha ijoo isaa qorannoo fi tajaajila ogeessota seeraatiif (Abukaattoo, Abbaa Seeraa, Abbaa Alangaa, Gorsaa Seeraa, fi Barattoota Seeraatiif) qofa kan qophaa\'eedha. Ogeessa seeraa yoo hin taane seenuun hin danda\'amu.'
                : 'ይህ የ SeeraAI መድረክ ለህግ ባለሙያዎች (ጠበቆች፣ ዳኞች፣ አቃቢያነ ህግ፣ የህግ አማካሪዎች እና የህግ ተማሪዎች) ብቻ የተዘጋጀ ነው። የህግ ባለሙያ ካልሆኑ መግባት አይችሉም።'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-400 space-y-1">
            <span className="font-semibold text-amber-300 block">📌 Ulaagaalee Seensaa / የመግቢያ መስፈርቶች:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Abukaattoo / Advocate (Waraqaa Hayyamaa qabu)</li>
              <li>Abbaa Seeraa / Judge (Mana Murtii kamiyyuu)</li>
              <li>Abbaa Alangaa / Public Prosecutor</li>
              <li>Gorsaa / Qorataa Seeraa / Legal Advisor</li>
              <li>Barataa / Barsiisaa Seeraa (Faculty of Law)</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setIsNotLegal(false);
                setAccessDeniedModal(false);
                setLegalRole('advocate');
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
            >
              🔄 Ani Ogeessa Seeraati, Deebi'ee Nan Mirkaneessa
            </button>
            <a
              href="https://www.google.com"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold block text-center"
            >
              Fuula Kana Dhiisii Ba'i
            </a>
          </div>
        </div>
      ) : (
        /* MAIN LEGAL PROFESSIONAL VERIFICATION GATEWAY */
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 animate-in fade-in duration-300">
          {/* Header */}
          <div className="text-center space-y-3">
            <SeeraAILogo size="lg" className="justify-center" />

            <div>
              {referralCreator ? (
                <div className="mt-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                  <span>👤</span>
                  <span>{referralCreator} isiniif qoodaniiru</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold mt-1">
                  <span>🛡️ Restricted to Legal Professionals Only</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {currentLang === 'om'
                ? 'Tajaajila seeraa itti fufuuf, eenyummaa Facebook, Telegram, LinkedIn yookiin Imeelii keessan mirkaneessaa ykn kallattiin seenaa.'
                : 'የሕግ አገልግሎቱን ለመቀጠል የፌስቡክ፣ ቴሌግራም፣ ሊንክድኢን ወይም ኢሜይል መረጃዎን ያረጋግጡ።'}
            </p>

            {/* FAST ACCESS BUTTONS: BIOMETRIC PASSKEY, 1-CLICK PASS, GOOGLE */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={biometricScanning || isVerifying}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-300"
              >
                <span>{biometricScanning ? '⏳' : '🔐'}</span>
                <span>
                  {biometricScanning
                    ? (currentLang === 'om' ? 'Qubaa/Fuula Sakatta\'aa jira...' : 'የጣት አሻራ/FaceID እየተረጋገጠ ነው...')
                    : (currentLang === 'om' ? 'Asxaa Qubaa / FaceID\'n Seeni (Biometric Passkey)' : 'በጣት አሻራ / FaceID ይግቡ (Biometric Passkey)')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-mono">FIDO2</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleInstantGuestAccess}
                  disabled={isVerifying || biometricScanning}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-800"
                >
                  <span>🚀 Kallattiin Seeni (1-Click Pass)</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isVerifying || biometricScanning}
                  className="w-full py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-100 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
                >
                  <span>🌐 Google'n Seeni (Google)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-mono tracking-wider shrink-0 uppercase">
              Yookiin Filannoo Kanaan Seeni
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* AUTH MODE SELECTOR TABS */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('biometric');
                setError('');
              }}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center cursor-pointer text-[10px] sm:text-[11px] ${
                authMode === 'biometric'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔐 Biometric</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('username_signup');
                setError('');
              }}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center cursor-pointer text-[10px] sm:text-[11px] ${
                authMode === 'username_signup'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>✨ Banadhu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('username_login');
                setError('');
              }}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center cursor-pointer text-[10px] sm:text-[11px] ${
                authMode === 'username_login'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔑 Seeni</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('quick_link');
                setError('');
              }}
              className={`py-2 px-1 rounded-xl font-bold transition-all text-center cursor-pointer text-[10px] sm:text-[11px] ${
                authMode === 'quick_link'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡ Social</span>
            </button>
          </div>

          {/* 0. BIOMETRIC PASSKEY AUTHENTICATION PANEL */}
          {authMode === 'biometric' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>
                      {currentLang === 'om' ? 'Eegumsa Biometric Ogeessota Seeraa:' : 'የህግ ባለሙያዎች ባዮሜትሪክ ጥበቃ፦'}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    FIDO2 WebAuthn
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Asxaa qubaa (Fingerprint), fuula (FaceID) yookiin passkey meeshaa keessanii fayyadamuun ragaalee mana murtii fi dokumantoota seeraa qulqullinaan eegaa seenaa.'
                    : 'የጣት አሻራ (Fingerprint)፣ የፊት ገጽታ (FaceID) ወይም የመሳሪያዎን Passkey በመጠቀም ሚስጥራዊ የፍርድ ቤት መረጃዎችን በከፍተኛ ደረጃ ጠብቀው ይግቡ።'}
                </p>
              </div>

              {/* Interactive Biometric Sensor Touch Pad */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={biometricScanning}
                  className={`w-24 h-24 mx-auto rounded-3xl border flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl ${
                    biometricScanning
                      ? 'border-amber-400 bg-amber-500/20 animate-pulse text-amber-300'
                      : biometricSuccess
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-700 bg-slate-900 hover:border-amber-500 hover:bg-slate-850 text-amber-400'
                  }`}
                  title="Touch to verify biometric credentials"
                >
                  <span className="text-4xl">
                    {biometricSuccess ? '✅' : biometricScanning ? '⏳' : '👆'}
                  </span>
                  <span className="text-[10px] font-mono font-bold mt-1 uppercase tracking-wider">
                    {biometricScanning ? 'Scanning' : biometricSuccess ? 'Verified' : 'Touch ID'}
                  </span>
                </button>

                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {biometricScanning
                      ? (currentLang === 'om' ? 'Qubaa ykn Fuula Sakatta\'aa Jira...' : 'የጣት አሻራ/FaceID በመፈተሽ ላይ...')
                      : (currentLang === 'om' ? 'Asxaa Qubaa Tuqi / FaceID Mul\'isi' : 'የጣት አሻራዎን ይጫኑ ወይም ፊትዎን ያሳዩ')}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {currentLang === 'om'
                      ? 'Sensor meeshaa keessanii tuquun battalatti eeyyama argadhaa.'
                      : 'የመሳሪያዎን የባዮሜትሪክ ሴንሰር በመጫን ፈጣን ፍቃድ ያግኙ።'}
                  </p>
                </div>

                {biometricFeedback && (
                  <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    {biometricFeedback}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={biometricScanning}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔐</span>
                  <span>
                    {currentLang === 'om' ? 'Asxaa Qubaa / FaceID\'n Seeni (Unlock Platform)' : 'በጣት አሻራ / FaceID ክፈት (Unlock Platform)'}
                  </span>
                </button>
              </div>

              {/* Passkey Enrollment for Current Device */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {currentLang === 'om' ? 'Galmee Meeshaa Kanaa (Device Passkey):' : 'የዚህ መሳሪያ ምዝገባ (Device Passkey)፦'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    biometricEnrollment ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {biometricEnrollment ? '✓ Enrolled' : 'Not Enrolled'}
                  </span>
                </div>

                {biometricEnrollment ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-mono text-slate-300">{biometricEnrollment.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span className="font-mono text-slate-300">{biometricEnrollment.deviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enrolled At:</span>
                      <span className="font-mono text-slate-300">{new Date(biometricEnrollment.enrolledAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    {currentLang === 'om'
                      ? 'Meeshaan kun duraan galmaa\'ee hin jiru. Buttoona gadii tuquun asxaa qubaa keessan galmeessaa.'
                      : 'ይህ መሳሪያ እስካሁን አልተመዘገበም። ከታች ያለውን በመጫን የጣት አሻራዎን ይመዝግቡ።'}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEnrollDevicePasskey}
                    disabled={isVerifying}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <span>➕ {biometricEnrollment ? 'Haaromsi (Re-enroll)' : 'Meeshaa Kanarratti Galmeessi (Enroll)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 1. USERNAME SIGN UP FORM */}
          {authMode === 'username_signup' && (
            <form onSubmit={handleUsernameSignUp} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <p className="font-bold">
                  📱 Account Banadhu (Sign Up with Username/Email):
                </p>
                <p className="text-[11px] text-slate-300">
                  Akkuma social media birootti, appilikeeshinii Seera AI kanaaf Username dhuunfaa (fkn: <code className="text-amber-400 font-mono font-bold">oroethio1</code>) yookiin Imeelii dhuunfaa keessan (fkn: <code className="text-amber-400 font-mono font-bold">user@gmail.com</code>) fi Password uumuun salphaatti account banachuu dandeessu.
                </p>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Username yookiin Imeelii Dhuunfaa (Username or Personal Email):</span>
                  <span className="text-[10px] text-amber-400 font-mono">fkn: user@gmail.com</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountUsername}
                  onChange={(e) => {
                    setAccountUsername(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="fkn: abukaattoo1, user@gmail.com, jurist_oromia"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password Keessan (Min 6 Characters):
                </label>
                <input
                  type="password"
                  required
                  value={accountPassword}
                  onChange={(e) => {
                    setAccountPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Full Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Maqaa Guutuu / Display Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="fkn: Obbo Gammachuu / Abukaattoo Caalaa"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Legal Profession Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Ogummaa Seeraa Keessan Filadhaa (Legal Profession):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'advocate', label: '⚖️ Abukaattoo (Advocate)' },
                    { id: 'judge', label: '👨‍⚖️ Abbaa Seeraa (Judge)' },
                    { id: 'prosecutor', label: '📜 Abbaa Alangaa (Prosecutor)' },
                    { id: 'advisor', label: '💼 Gorsaa Seeraa (Legal Advisor)' },
                    { id: 'student', label: '🎓 Barataa/Barsiisaa Seeraa' },
                    { id: 'researcher', label: '🔍 Qorataa Seeraa (Researcher)' },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        legalRole === role.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Networking Links & Privacy */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <span className="font-semibold text-slate-300 block">
                  🌐 Professional Social Links (Optional):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={linkedinLink}
                    onChange={(e) => setLinkedinLink(e.target.value)}
                    placeholder="LinkedIn URL..."
                    className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="Facebook URL..."
                    className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={telegramLink}
                    onChange={(e) => setTelegramLink(e.target.value)}
                    placeholder="Telegram URL..."
                    className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Oath Checkbox */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedOath}
                    onChange={(e) => setAcceptedOath(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 leading-relaxed select-none">
                    <strong>Kakuu Ogummaa:</strong> Ani ogeessa seeraa ta'uu koo fi tajaajila koodii fi kuusaa seeraa kana qorannoo fi hojii seeraatiif qofa akkan fayyadamu nan mirkaneessa.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isVerifying ? 'Account Banamaa jira...' : '✨ Account Banadhu & Seeni →'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('username_login');
                    setError('');
                  }}
                  className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Duraan account Username qabduu? 🔑 Kallattiin Username'n Seeni
                </button>
              </div>
            </form>
          )}

          {/* 2. USERNAME SIGN IN FORM */}
          {authMode === 'username_login' && (
            <form onSubmit={handleUsernameLogin} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <p className="font-bold">
                  🔑 Username & Password'n Seeni (Direct Login):
                </p>
                <p className="text-[11px] text-slate-300">
                  Username (fkn: <code className="text-amber-400 font-mono font-bold">oroethio1</code>) fi Password keessan galchuun kallattiin seenuu danda'tu.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Username ykn Email Keessan:
                </label>
                <input
                  type="text"
                  required
                  value={accountUsername}
                  onChange={(e) => {
                    setAccountUsername(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="fkn: oroethio1 ykn user@saiethio.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password Keessan:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setResetEmail(accountUsername);
                      setError('');
                    }}
                    className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    🔐 Password dagattaniittuu?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={accountPassword}
                  onChange={(e) => {
                    setAccountPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isVerifying ? 'Seenaa jira...' : '🔑 Kallattiin Seeni (Sign In) →'}</span>
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('username_signup');
                    setError('');
                  }}
                  className="text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Account Username hin qabduu? ✨ Username Haaraa Banadhu
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🔐 Password Deebisuu (Forgot Password)</span>
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {currentLang === 'om'
                    ? 'Email ykn Username keessan galchuun linkii password haaraa saaggtan imeelii keessaniif ergaa.'
                    : 'የይለፍ ቃልዎን ለመቀየር ኢሜይልዎን ወይም የተጠቃሚ ስምዎን ያስገቡ። የመልሶ ማግኛ ሊንክ ይላካል።'}
                </p>
              </div>

              {resetSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                    <span>📩 Linkii Password Deebisuu Ergameera!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {currentLang === 'om'
                      ? 'Linkiin password deebisuu imeelii keessaniif ergameera. Maaloo inbox/spam keessan banuun linkii sana cuqaasuun password haaraa saagaa.'
                      : 'የይለፍ ቃል መልሶ ማግኛ ሊንክ ወደ ኢሜይልዎ ተላክል። እባክዎ ኢሜይልዎን ያረጋግጡ።'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('username_login');
                      setResetSuccess(false);
                      setError('');
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    ← Gara Seensaatti Deebi'i (Back to Login)
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Email ykn Username Keessan:
                    </label>
                    <input
                      type="text"
                      required
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="fkn: oroethio1 ykn user@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-950 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isVerifying ? 'Ergamaa jira...' : '📩 Linkii Password Deebisuu Ergi →'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('username_login');
                        setError('');
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      ← Gara Seensaatti Deebi'i (Back to Login)
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* 3. QUICK LINK & OATH FORM */}
          {authMode === 'quick_link' && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
              {/* 1. Full Name / Visitor Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Maqaa Guutuu / Link Social Media:</span>
                  <span className="text-[10px] text-amber-400 font-mono">Link ykn Username</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="fkn: Obbo Gammachuu / @AyyuLawyer (Optional)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* 2. Legal Profession Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Ogummaa Seeraa Keessan Filadhaa (Legal Profession):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'advocate', label: '⚖️ Abukaattoo (Advocate)' },
                    { id: 'judge', label: '👨‍⚖️ Abbaa Seeraa (Judge)' },
                    { id: 'prosecutor', label: '📜 Abbaa Alangaa (Prosecutor)' },
                    { id: 'advisor', label: '💼 Gorsaa Seeraa (Legal Advisor)' },
                    { id: 'student', label: '🎓 Barataa/Barsiisaa Seeraa' },
                    { id: 'researcher', label: '🔍 Qorataa Seeraa (Researcher)' },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        legalRole === role.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{role.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleRoleChange('not_legal')}
                  className="w-full mt-1 p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-950/70 text-[11px] font-semibold text-center cursor-pointer transition-colors"
                >
                  ❌ Ogeessa Seeraa Miti (Not a Legal Professional)
                </button>
              </div>

              {/* 3. Professional Networking Links */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>🌐 Hidhata Miidiyaa & Professional Networking (Optional)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono px-2 py-0.5 rounded bg-slate-900 border border-amber-500/30">
                    LinkedIn & Social
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      💼 LinkedIn Profile URL:
                    </label>
                    <input
                      type="text"
                      value={linkedinLink}
                      onChange={(e) => setLinkedinLink(e.target.value)}
                      placeholder="fkn: linkedin.com/in/username..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        📘 Facebook Profile / Group:
                      </label>
                      <input
                        type="text"
                        value={facebookLink}
                        onChange={(e) => setFacebookLink(e.target.value)}
                        placeholder="facebook.com/username..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        ✈️ Telegram Profile / Channel:
                      </label>
                      <input
                        type="text"
                        value={telegramLink}
                        onChange={(e) => setTelegramLink(e.target.value)}
                        placeholder="t.me/username..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-[11px] space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span>🛡️ Eegumsa Iccitii & Akeekkachiisa Seeraa (Privacy Protection)</span>
                  </div>
                  <p className="leading-relaxed text-[10.5px]">
                    • <strong>Data Only:</strong> Hidhanni miidiyaa hawaasaa mirkaneessa eenyummaa fi ragaa qorannoo seeraatiif qofa kan oolu ta'ee, mirga iccitii (privacy) keessan irratti dhiibbaa tokkoyyuu hin uumu.
                  </p>
                </div>
              </div>

              {/* Oath */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedOath}
                    onChange={(e) => setAcceptedOath(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 leading-relaxed select-none">
                    <strong>Kakuu Ogummaa Seeraa:</strong> Ani ogeessa seeraa ta'uu koo fi tajaajila koodii fi kuusaa seeraa kana qorannoo fi hojii seeraatiif qofa akkan fayyadamu nan mirkaneessa.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isVerifying ? 'Mirkaneessaa jira...' : '✓ Social Link Eenyummaa Mirkaneessi'}</span>
              </button>
            </form>
          )}

          {/* Legal Ownership Footer */}
          <div className="pt-2 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
            <span>© 2026 SAI Ethio (www.saorethio1.com) • Ogeessa Seeraa Ayele Be Dha</span>
          </div>
        </div>
      )}
    </div>
  );
};
