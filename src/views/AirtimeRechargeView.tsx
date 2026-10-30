import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AirtimeRechargeViewProps {
  currentLang: Language;
}

export const AirtimeRechargeView: React.FC<AirtimeRechargeViewProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [provider, setProvider] = useState<'ethio' | 'safaricom'>('ethio');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsSubmitting(true);
    setFeedback('');

    try {
      if (db) {
        await addDoc(collection(db, 'airtime_requests'), {
          provider,
          phone,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      }
      setFeedback(
        currentLang === 'om' 
          ? 'Gaaffiin keessan galmeeffameera. Kun interface qofa dha, qarshiin hin kaffalamu.'
          : 'ጥያቄዎ ተመዝግቧል። ይህ የአገልግሎት ማሳያ ብቻ ነው፣ ክፍያ አይፈጸምም።'
      );
      setPhone('');
    } catch (e) {
      setFeedback('Error submitting request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl space-y-6">
      <h2 className="text-xl font-bold text-slate-100">
        {currentLang === 'om' ? 'Airtime Recharge (Mokkoraa Interface)' : 'Airtime Recharge (Interface Test)'}
      </h2>
      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200">
        ℹ️ {currentLang === 'om' 
          ? 'Kun interface qofa dha. Kaffaltiin otomaatikii hin raawwatamu.'
          : 'ይህ የአገልግሎት ማሳያ ብቻ ነው። ክፍያ አይፈጸምም።'}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Provider:</label>
          <select 
            value={provider} 
            onChange={(e) => setProvider(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200"
          >
            <option value="ethio">Ethio Telecom</option>
            <option value="safaricom">Safaricom</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Phone:</label>
          <input 
            type="text" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200"
            placeholder="09..."
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-4 py-2 bg-amber-500 rounded-xl text-slate-950 font-bold text-xs"
        >
          {isSubmitting ? '...' : 'Request (Mokkoraa)'}
        </button>
      </form>
      {feedback && <div className="text-xs text-emerald-400">{feedback}</div>}
    </div>
  );
};
