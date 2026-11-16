import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const SystemWarningModal = ({ currentLang, onClose }: { currentLang: 'om' | 'am' | 'en', onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
        <div className="bg-slate-900 border border-amber-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">
                {currentLang === 'om' ? 'Akeekkachiisa' : currentLang === 'am' ? 'ማስጠንቀቂያ' : 'Warning'}
            </h2>
            <p className="text-slate-300 text-sm">
                {currentLang === 'om' ? 'Kun appii seeraa qabatamaadha. Odeeffannoon kee iccitii qaba.' : currentLang === 'am' ? 'ይህ ህጋዊ መተግበሪያ ነው። መረጃዎ ሚስጥራዊ ነው።' : 'This is a legal application. Your data is confidential.'}
            </p>
            <button onClick={onClose} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl">
                {currentLang === 'om' ? 'Hubadheera' : currentLang === 'am' ? 'ተረድቻለሁ' : 'I Understand'}
            </button>
        </div>
    </div>
  );
};
