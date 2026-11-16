import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Save, 
  Smartphone, 
  Check, 
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { 
  UserSettings, 
  saveLocalPin, 
  verifyLocalPin, 
  saveLocalPassword, 
  getSavedLocalPassword, 
  verifyLocalPassword, 
  removeLocalPin, 
  removeLocalPassword, 
  getLocalCredentials, 
  persistLocalCredentials,
  hasConfiguredLocalPin, 
  hasConfiguredLocalPassword 
} from '../services/storage';

interface LocalCredentialSecurityManagerProps {
  currentLang: Language;
  settings: UserSettings;
  onSettingsUpdate: (newSettings: UserSettings) => void;
}

export const LocalCredentialSecurityManager: React.FC<LocalCredentialSecurityManagerProps> = ({
  currentLang,
  settings,
  onSettingsUpdate,
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [activeTab, setActiveTab] = useState<'pin' | 'password' | 'test' | 'prefs'>('pin');

  // PIN Form State
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinHintInput, setPinHintInput] = useState('');
  const [pinStatusMsg, setPinStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form State
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState(settings.email || settings.appUsername || '');
  const [showPassword, setShowPassword] = useState(false);
  const [passStatusMsg, setPassStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test Authentication State
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state reflecting stored credentials
  const [hasPin, setHasPin] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | undefined>(undefined);
  const [autoPrompt, setAutoPrompt] = useState(false);

  useEffect(() => {
    refreshCredentialState();
  }, [settings]);

  const refreshCredentialState = () => {
    const creds = getLocalCredentials();
    const pinExists = hasConfiguredLocalPin();
    const passExists = hasConfiguredLocalPassword();

    setHasPin(pinExists);
    setHasPass(passExists);
    setCurrentHint(creds.pinHint);
    setAutoPrompt(!!creds.autoPromptOnOpen);
    setPinHintInput(creds.pinHint || '');
  };

  // Handle Save PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatusMsg(null);

    const cleanPin = pinInput.trim();
    const cleanConfirm = confirmPinInput.trim();

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8 || !/^\d+$/.test(cleanPin)) {
      setPinStatusMsg({
        type: 'error',
        text: isOm 
          ? 'PIN dijitii 4 hanga 8 ta\'uu qaba (Lakkofsa qofa)!' 
          : isAm 
          ? 'ሚስጥር ቁጥር ከ4 እስከ 8 አሃዞች መሆን አለበት!' 
          : 'PIN must be 4 to 8 numeric digits!',
      });
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setPinStatusMsg({
        type: 'error',
        text: isOm 
          ? 'Lakk. Iccitii lachanuu wal hin simne!' 
          : isAm 
          ? 'የገቡት ሚስጥር ቁጥሮች አይመሳሰሉም!' 
          : 'PINs do not match. Please re-enter.',
      });
      return;
    }

    const res = saveLocalPin(cleanPin, pinHintInput);
    if (res.success) {
      setPinStatusMsg({
        type: 'success',
        text: isOm 
          ? 'Lakk. Iccitii (PIN) milkaa\'inaan kuusameera!' 
          : isAm 
          ? 'ሚስጥር ቁጥርዎ በተሳካ ሁኔታ ተቀምጧል!' 
          : 'PIN successfully hashed & saved to device storage!',
      });
      setPinInput('');
      setConfirmPinInput('');
      refreshCredentialState();
      setTimeout(() => setPinStatusMsg(null), 4000);
    } else {
      setPinStatusMsg({ type: 'error', text: res.error || 'Failed to save PIN' });
    }
  };

  // Handle Remove PIN
  const handleRemovePin = () => {
    if (!confirm(isOm ? 'PIN kuufame kana haquu ni barbaadduu?' : 'Are you sure you want to remove the stored PIN?')) return;
    removeLocalPin();
    setPinStatusMsg({
      type: 'success',
      text: isOm ? 'PIN haqameera.' : 'Stored PIN removed.',
    });
    refreshCredentialState();
    setTimeout(() => setPinStatusMsg(null), 3000);
  };

  // Handle Save Password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatusMsg(null);

    const cleanPass = passwordInput.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setPassStatusMsg({
        type: 'error',
        text: isOm 
          ? 'Password arfiilee 6 yoo xiqqaate qabaachuu qaba!' 
          : 'Password must be at least 6 characters long.',
      });
      return;
    }

    const res = saveLocalPassword(cleanPass, usernameInput);
    if (res.success) {
      setPassStatusMsg({
        type: 'success',
        text: isOm 
          ? 'Password nageenyaan AES-256n kuufameera!' 
          : isAm 
          ? 'የይለፍ ቃልዎ በደህንነት ተቀምጧል!' 
          : 'Password securely encrypted & saved for 1-click unlock!',
      });
      setPasswordInput('');
      refreshCredentialState();
      setTimeout(() => setPassStatusMsg(null), 4000);
    } else {
      setPassStatusMsg({ type: 'error', text: res.error || 'Failed to save password' });
    }
  };

  // Handle Remove Password
  const handleRemovePassword = () => {
    if (!confirm(isOm ? 'Password kuufame kana haquu ni barbaadduu?' : 'Remove saved password?')) return;
    removeLocalPassword();
    setPassStatusMsg({
      type: 'success',
      text: isOm ? 'Password kuufame haqameera.' : 'Saved password removed.',
    });
    refreshCredentialState();
    setTimeout(() => setPassStatusMsg(null), 3000);
  };

  // Handle Test Authentication
  const handleTestAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const val = testInput.trim();
    if (!val) return;

    const pinMatch = verifyLocalPin(val);
    const passMatch = verifyLocalPassword(val);

    if (pinMatch || passMatch) {
      setTestResult({
        type: 'success',
        text: isOm 
          ? `✓ Mirkaneeffameera! (${pinMatch ? 'PIN Sirriidha' : 'Password Sirriidha'})` 
          : isAm 
          ? `✓ ተረጋግጧል! (${pinMatch ? 'ትክክለኛ PIN' : 'ትክክለኛ የይለፍ ቃል'})` 
          : `✓ Authentication Verified! (${pinMatch ? 'Valid PIN' : 'Valid Password'})`,
      });
    } else {
      setTestResult({
        type: 'error',
        text: isOm 
          ? 'Dogoggora! Lakk. Iccitii ykn Password hin walsimne.' 
          : isAm 
          ? 'ልክ ያልሆነ ሚስጥር ቁጥር ወይም የይለፍ ቃል!' 
          : 'Incorrect credentials! Verification failed.',
      });
    }
  };

  // Toggle Auto Prompt
  const handleToggleAutoPrompt = (val: boolean) => {
    setAutoPrompt(val);
    persistLocalCredentials({ autoPromptOnOpen: val });
    const updated = {
      ...settings,
      localCredentials: {
        ...getLocalCredentials(),
        autoPromptOnOpen: val,
      },
    };
    onSettingsUpdate(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-serif-legal">
                {isOm 
                  ? 'Bulchiinsa PIN fi Password Dhuunfaa' 
                  : isAm 
                  ? 'የግል ሚስጥር ቁጥር እና የይለፍ ቃል አስተዳደር' 
                  : 'Local PIN & Password Security Management'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AES-256 + SHA-256
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOm 
                ? 'Lakk. iccitii (PIN) fi password keessan meeshaa kana irratti nageenyaan qusadhaa; yeroo hunda galchuun hin barbaachisu.' 
                : isAm 
                ? 'ሚስጥር ቁጥር እና የይለፍ ቃልዎን በመሳሪያዎ ላይ በደህንነት ያስቀምጡ፤ በቀላሉ ለመግባት ይጠቀሙ።' 
                : 'Securely store and manage your local authentication PIN and password on this device for instant local unlocking.'}
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 ${
            hasPin 
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
          }`}>
            <span>{hasPin ? '🟢' : '🟡'}</span>
            <span>PIN: {hasPin ? (isOm ? 'Qophaa\'eera' : 'Configured') : (isOm ? 'Hin Jiru' : 'Not Set')}</span>
          </div>

          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 ${
            hasPass 
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <span>{hasPass ? '🟢' : '⚪'}</span>
            <span>Pass: {hasPass ? (isOm ? 'Quusatame' : 'Saved') : (isOm ? 'Hin Quusatamne' : 'Unsaved')}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('pin')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pin'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{isOm ? '1. Lakk. Iccitii (PIN)' : '1. PIN Setup'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'password'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{isOm ? '2. Password Quusadhu' : '2. Save Password'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'test'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isOm ? '3. Qoradhu (Test Auth)' : '3. Test Auth'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prefs')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'prefs'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{isOm ? '4. Filannoowwan' : '4. Preferences'}</span>
        </button>
      </div>

      {/* TAB 1: PIN SETUP */}
      {activeTab === 'pin' && (
        <form onSubmit={handleSavePin} className="space-y-4 max-w-lg">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>{isOm ? 'PIN Haaraa Qopheessi / Jijjiiri' : 'Set or Change Authentication PIN'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isOm 
                ? 'PIN dijitii 4 hanga 8 kan lakkoofsa qofa of keessaa qabu galchaa. Kun meeshaa keessan irratti salted SHA-256 hash ta\'ee kuufama.' 
                : 'Enter a 4-8 numeric digit PIN. Stored locally with salted SHA-256 hashing.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isOm ? 'PIN Haaraa (4-8 Digits)' : 'New PIN'}
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono tracking-widest text-center text-base focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isOm ? 'PIN Irra Deebi\'ii Galchi' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono tracking-widest text-center text-base focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Hint */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>{isOm ? 'Yaadachiisa PIN / Security Hint (Filannoo)' : 'Security Hint (Optional)'}</span>
              </label>
              <input
                type="text"
                value={pinHintInput}
                onChange={(e) => setPinHintInput(e.target.value)}
                placeholder={isOm ? 'Fkn: Guyyaa dhalootaa, lakk. konkolaataa...' : 'e.g., Year of graduation, badge number...'}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Feedback */}
          {pinStatusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              pinStatusMsg.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}>
              {pinStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{pinStatusMsg.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!pinInput || !confirmPinInput}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isOm ? 'PIN Nageenyaan Qusadhu' : 'Save PIN Securely'}</span>
            </button>

            {hasPin && (
              <button
                type="button"
                onClick={handleRemovePin}
                className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isOm ? 'PIN Balleessi' : 'Remove PIN'}</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* TAB 2: SAVE PASSWORD */}
      {activeTab === 'password' && (
        <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>{isOm ? 'Password Akkaawuntii Meeshaa Irratti Qusadhu' : 'Save Account Password on Device'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isOm 
                ? 'Password keessan meeshaa kana irratti cufamee (AES-256 encrypted) akka qusatamu taasisaa. Fuula duratti 1-click unlock gochuuf isin gargaara.' 
                : 'Encrypts and stores your account password using AES-256 with a unique hardware salt for fast local unlocking.'}
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isOm ? 'Imeelii / Maqaa Fayyadamaa' : 'Account Email / Username'}
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="user@seeraai.et"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isOm ? 'Password Keessan' : 'Account Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {passStatusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              passStatusMsg.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}>
              {passStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passStatusMsg.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!passwordInput}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isOm ? 'Password Qusadhu (AES-256)' : 'Save Encrypted Password'}</span>
            </button>

            {hasPass && (
              <button
                type="button"
                onClick={handleRemovePassword}
                className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isOm ? 'Password Kuufame Balleessi' : 'Delete Saved Password'}</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* TAB 3: TEST AUTHENTICATION */}
      {activeTab === 'test' && (
        <form onSubmit={handleTestAuth} className="space-y-4 max-w-lg">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isOm ? 'Qorannoo PIN fi Password (Test Verification)' : 'Test PIN & Password Unlock'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isOm 
                ? 'PIN ykn Password keessan galchuun sirrii ta\'uu isaa battalatti qoradhaa.' 
                : 'Enter your configured PIN or password to test that unlock authentication passes without errors.'}
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isOm ? 'PIN ykn Password Galchaa' : 'Enter PIN or Password to Test'}
              </label>
              <input
                type="password"
                value={testInput}
                onChange={(e) => {
                  setTestInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={!testInput}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isOm ? 'Qori / Verify Credentials' : 'Verify Credentials Now'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.type === 'success' 
                ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
                : 'bg-rose-950 border-rose-500 text-rose-200'
            }`}>
              {testResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{testResult.text}</span>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: PREFERENCES */}
      {activeTab === 'prefs' && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>{isOm ? 'Filannoowwan Nageenya Meeshaa' : 'Local Device Security Preferences'}</span>
            </h3>

            {/* Toggle: Auto Prompt on Open */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">
                  {isOm ? 'Yeroo appiin banamu PIN gaafadhu' : 'Prompt PIN on App Launch'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {isOm 
                    ? 'Appiin yeroo banamu qabiyyee iccitii eeguuf dafee PIN gaafata.' 
                    : 'Enforce PIN prompt when opening sensitive court files or settings.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleAutoPrompt(!autoPrompt)}
                className="text-amber-400 hover:text-amber-300 text-2xl cursor-pointer"
              >
                {autoPrompt ? <ToggleRight className="w-7 h-7 text-amber-500" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
              </button>
            </div>

            {/* Auto Lock timer shortcut */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200 block">
                {isOm ? 'Auto-Lock Yeroo Hojii Dhaabuu' : 'Auto-Lock Inactivity Timer'}
              </span>
              <p className="text-[11px] text-slate-400">
                {isOm 
                  ? 'Yoo daqiiqaa murtaa\'eef meeshaan hin tuttuqamne, ofumaan appichi ni cufama.' 
                  : 'Automatically lock app if left inactive for configured minutes.'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {[0, 5, 15, 30].map((mins) => {
                  const isActive = (settings.autoLockTimeout || 0) === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, autoLockTimeout: mins };
                        onSettingsUpdate(updated);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {mins === 0 ? (isOm ? 'Dhaami' : 'Off') : `${mins}m`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
