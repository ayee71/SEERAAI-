import React, { useState } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, Lock, Smartphone, Globe } from 'lucide-react';

interface PaymentViewProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const getSyncStatusLabel = (status: string = 'verified', lang: string = 'om') => {
  return {
    statusText: status.toUpperCase(),
    label: status === 'verified' ? 'Verified & Active' : 'Pending Verification',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    icon: '✅'
  };
};

export const PaymentView: React.FC<PaymentViewProps> = ({ onSuccess, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState<'telebirr' | 'cbe' | 'chapa' | 'card'>('telebirr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      if (onSuccess) onSuccess();
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold">SEERAAI Premium Upgrade</h2>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">
          ✕
        </button>
      </div>

      {success ? (
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
          <h3 className="text-xl font-bold">Kaffaltiin Milkaa'eera! (Payment Successful)</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ammaa kaasee SEERAAI Pro tajaajila guututti fayyadamuu dandeessa.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePay} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Filannoo kaffaltii barbaaddan filachuun galmaa'aa:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSelectedMethod('telebirr')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 font-medium transition-all ${
                selectedMethod === 'telebirr'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Smartphone className="w-5 h-5 text-indigo-500" />
              <span className="text-xs">Telebirr</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('cbe')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 font-medium transition-all ${
                selectedMethod === 'cbe'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Globe className="w-5 h-5 text-purple-500" />
              <span className="text-xs">CBE Birr</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Lakkoofsa Bilbilaa / Account Number
            </label>
            <input
              type="text"
              required
              placeholder="+251 9..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100">
              <span>Gatii Ji'aa (Monthly Subscription)</span>
              <span>150 ETB / mo</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
              <Lock className="w-3 h-3" /> Nageenyi guututti eegameera (SSL Secured)
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Kaffaltii Raawwadhu (Pay Now)'}
          </button>
        </form>
      )}
    </div>
  );
};

export default PaymentView;
