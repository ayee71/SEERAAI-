import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Delete, 
  HelpCircle,
  ShieldCheck 
} from 'lucide-react';
import { 
  verifyLocalPin, 
  verifyLocalPassword, 
  getLocalCredentials, 
  hasConfiguredLocalPin, 
  hasConfiguredLocalPassword 
} from '../services/storage';
import { isOwnerKey } from '../services/ownerAuth';

interface PasscodeEntryComponentProps {
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
}

export const PasscodeEntryComponent: React.FC<PasscodeEntryComponentProps> = ({ 
  onSuccess, 
  title, 
  subtitle,
  onCancel 
}) => {
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [pinHint, setPinHint] = useState<string | null>(null);

  useEffect(() => {
    const creds = getLocalCredentials();
    const pinConfigured = hasConfiguredLocalPin();
    const passConfigured = hasConfiguredLocalPassword();
    setHasPin(pinConfigured);
    setHasPass(passConfigured);
    setPinHint(creds.pinHint || null);

    // If only password is saved and no PIN, default to password mode
    if (!pinConfigured && passConfigured) {
      setAuthMode('password');
    }
  }, []);

  const handleVerify = async (valToTest?: string) => {
    const value = (valToTest !== undefined ? valToTest : code).trim();
    if (!value) {
      setError('Maaloo lakk. iccitii ykn password galchaa / Please enter code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    // Check PIN or Password or Owner Master Key
    let passed = false;

    if (authMode === 'pin') {
      passed = verifyLocalPin(value) || await isOwnerKey(value);
    } else {
      passed = verifyLocalPassword(value) || await isOwnerKey(value);
    }

    if (passed) {
      setTimeout(() => {
        setIsVerifying(false);
        onSuccess();
      }, 200);
    } else {
      setTimeout(() => {
        setIsVerifying(false);
        setError(
          authMode === 'pin'
            ? 'Lakk. Iccitii (PIN) dogoggora! Irra deebi\'aa yaalaa / Incorrect PIN'
            : 'Password dogoggora! Irra deebi\'aa yaalaa / Incorrect Password'
        );
        setCode('');
      }, 250);
    }
  };

  const handleKeypadPress = async (digit: string) => {
    if (code.length >= 8) return;
    const next = code + digit;
    setCode(next);
    setError(null);
    // If length is 4 or 6, auto-verify if it matches
    if (next.length === 4 || next.length === 6) {
      const isOwner = await isOwnerKey(next);
      if (verifyLocalPin(next) || isOwner) {
        handleVerify(next);
      }
    }
  };

  const handleDeleteDigit = () => {
    setCode((prev) => prev.slice(0, -1));
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-sm mx-auto backdrop-blur-md">
      {/* Icon Badge */}
      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xl mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
        {isVerifying ? <Unlock className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
      </div>

      <h2 className="text-base sm:text-lg font-bold text-slate-100 text-center font-serif-legal">
        {title || (authMode === 'pin' ? 'Lakk. Iccitii (PIN) Galchaa' : 'Password Galchaa')}
      </h2>
      <p className="text-xs text-slate-400 text-center mt-0.5 mb-4">
        {subtitle || (authMode === 'pin' ? 'Kutaa nageenyaa banuuf PIN keessan galchaa' : 'Seensa dhuunfaaf password keessan galchaa')}
      </p>

      {/* Mode Switcher if both or password configured */}
      {hasPass && (
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setCode('');
              setError(null);
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              authMode === 'pin' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setCode('');
              setError(null);
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              authMode === 'password' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Password
          </button>
        </div>
      )}

      {/* PIN Dots or Password Field */}
      {authMode === 'pin' ? (
        <div className="w-full space-y-4">
          {/* Visual PIN Dots Indicator */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  code.length > idx
                    ? 'bg-amber-500 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Numeric Keypad for fast touch/tablet entry */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500 active:text-slate-950 text-slate-100 font-bold text-base border border-slate-700/60 shadow transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleDeleteDigit}
              className="h-11 rounded-xl bg-slate-800/50 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 flex items-center justify-center border border-slate-800 transition-all cursor-pointer"
              title="Delete"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500 active:text-slate-950 text-slate-100 font-bold text-base border border-slate-700/60 shadow transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={!code || isVerifying}
              className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              {isVerifying ? '...' : 'OK'}
            </button>
          </div>
        </div>
      ) : (
        /* Password Input Mode */
        <div className="w-full space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify();
              }}
              placeholder="Enter password..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={!code || isVerifying}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isVerifying ? 'Mirkaneessaa...' : 'Bani / Unlock'}</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-1.5 text-rose-400 text-xs text-center bg-rose-950/60 border border-rose-800/60 px-3 py-1.5 rounded-xl animate-shake">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PIN Hint */}
      {pinHint && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-[11px] text-amber-500/80 hover:text-amber-400 flex items-center gap-1 mx-auto underline cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showHint ? 'Hint Cufi' : 'Yaadachiisa PIN (Hint) Agarsiisi'}</span>
          </button>
          {showHint && (
            <p className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 mt-1 font-mono">
              💡 {pinHint}
            </p>
          )}
        </div>
      )}


    </div>
  );
};
