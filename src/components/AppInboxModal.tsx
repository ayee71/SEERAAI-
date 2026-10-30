import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Copy, Check, X, Bell } from 'lucide-react';
import { Language } from '../i18n/translations';

interface InboxMessage {
  id: string;
  email: string;
  code: string;
  title: string;
  timestamp: string;
  read: boolean;
}

interface AppInboxModalProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onUseCode?: (code: string) => void;
}

export const AppInboxModal: React.FC<AppInboxModalProps> = ({
  currentLang,
  isOpen,
  onClose,
  userEmail,
  onUseCode
}) => {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, userEmail]);

  const loadMessages = () => {
    try {
      const raw = localStorage.getItem('seera_app_inbox_messages');
      if (raw) {
        const list: InboxMessage[] = JSON.parse(raw);
        if (userEmail) {
          setMessages(list.filter(m => m.email.toLowerCase() === userEmail.toLowerCase() || m.email === 'all'));
        } else {
          setMessages(list);
        }
      } else {
        // Default sample message if empty
        const sample: InboxMessage[] = [
          {
            id: 'msg_welcome',
            email: userEmail || 'user@saiethio.com',
            code: '789456',
            title: currentLang === 'om' ? 'Koodii Mirkaneessaa Jalqabaa (Welcome Confirmation Code)' : 'Initial Confirmation Code',
            timestamp: new Date().toLocaleTimeString(),
            read: false
          }
        ];
        setMessages(sample);
      }
    } catch {
      setMessages([]);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    if (onUseCode) {
      onUseCode(code);
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearMessages = () => {
    localStorage.removeItem('seera_app_inbox_messages');
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {currentLang === 'om' ? 'Sanduuqa Ergaa Appii (In-App Inbox)' : 'የመተግበሪያ ውስጥ የገቢ መልእክት (In-App Inbox)'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Koodiiwwan mirkaneessaa (Confirmation Codes) asitti argattu' : 'የማረጋገጫ ኮዶች (Confirmation Codes) በዚህ ይደርሰዎታል'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Bell className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
              <p className="text-sm text-slate-400">
                {currentLang === 'om' ? 'Ergaa ykn Koodiin haaraan hin jiru.' : 'ምንም አዲስ መልእክት ወይም ኮድ የለም።'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-2 hover:border-amber-500/50 transition-all shadow-md"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-bold">{msg.email}</span>
                  <span className="text-slate-500">{msg.timestamp}</span>
                </div>
                <h4 className="font-bold text-sm text-white">{msg.title}</h4>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg tracking-widest text-emerald-300 font-extrabold">{msg.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(msg.id, msg.code)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentLang === 'om' ? 'Fudhateera' : 'ኮፒ ሆኗል'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{currentLang === 'om' ? 'Koodii Fudhachuu' : 'ኮፒ አድርግ'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {messages.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={clearMessages}
              className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
            >
              {currentLang === 'om' ? 'Ergaa Hunda Haquu' : 'ሁሉንም መልዕክቶች አጽዳ'}
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              {messages.length} {currentLang === 'om' ? 'Ergaa(wwan)' : 'መልእክት(ዎች)'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
