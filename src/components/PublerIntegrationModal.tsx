import React, { useState } from 'react';
import { Language } from '../i18n/translations';
import { Share2, CheckCircle2, Key, ExternalLink, Globe, Shield, Sparkles, Copy } from 'lucide-react';

interface PublerIntegrationModalProps {
  currentLang: Language;
  onClose: () => void;
}

export const PublerIntegrationModal: React.FC<PublerIntegrationModalProps> = ({ currentLang, onClose }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('seera_publer_api_key') || '');
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('seera_publer_workspace_id') || '');
  const [connected, setConnected] = useState<boolean>(Boolean(localStorage.getItem('seera_publer_connected')));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const sampleWebhook = 'https://saorethiol.com/api/publer/webhook';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('seera_publer_api_key', apiKey);
      localStorage.setItem('seera_publer_workspace_id', workspaceId);
      localStorage.setItem('seera_publer_connected', 'true');
      setConnected(true);
      setSaving(false);
    }, 600);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('seera_publer_api_key');
    localStorage.removeItem('seera_publer_workspace_id');
    localStorage.removeItem('seera_publer_connected');
    setApiKey('');
    setWorkspaceId('');
    setConnected(false);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(sampleWebhook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl font-bold">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-serif-legal font-bold text-amber-300">
              {currentLang === 'om' ? 'Walitti Hidhiinsa Publer (Publer.com Integration)' : currentLang === 'am' ? 'የPubler ማገናኛ (Publer Integration)' : 'Publer Social Media Integration'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentLang === 'om'
                ? 'Labsiiwwan seeraa fi barreeffama miidiyaa hawaasaa gara Publer (publer.com)tti ergii fi saganteessi.'
                : 'Publish and schedule legal proclamations and social posts directly to Publer.com'}
            </p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-semibold text-sm">
                  {currentLang === 'om' ? 'Publer waliin milkaa\'inaan walitti hidhameera!' : 'Successfully connected to Publer!'}
                </div>
                <div className="text-xs text-emerald-400/80">
                  Workspace ID: {workspaceId || 'Default Workspace'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="text-slate-300 font-semibold flex items-center gap-2">
                <span>🔗</span>
                <span>SeeraAI Publer Webhook & API Sync Endpoint</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-amber-400">
                <span className="truncate">{sampleWebhook}</span>
                <button
                  onClick={copyWebhook}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg flex items-center gap-1 shrink-0"
                >
                  <Copy size={12} />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-all cursor-pointer"
              >
                {currentLang === 'om' ? 'Walitti Hidhiinsa Addaan Kuti' : 'Disconnect Publer'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                {currentLang === 'om' ? 'Cufi' : 'Done'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" />
                <span>{currentLang === 'om' ? 'Akkaataa Itti Fayyadamtu (How to connect)' : 'How to connect your Publer account:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>{currentLang === 'om' ? 'Gara https://publer.com deemii akkaawuntii kee bani.' : 'Go to https://publer.com and log in to your account.'}</li>
                <li>{currentLang === 'om' ? 'Settings ➔ API Keys irraa API Key kee fudhadhu.' : 'Navigate to Account Settings ➔ API Keys to generate/copy your API Key.'}</li>
                <li>{currentLang === 'om' ? 'Itti aansuun Key fi Workspace ID kee asitti galchi.' : 'Paste your API Key and Workspace ID below.'}</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {currentLang === 'om' ? 'Publer API Key (Token)' : 'Publer API Key'}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="publer_api_live_..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {currentLang === 'om' ? 'Publer Workspace ID (Optional)' : 'Publer Workspace ID (Optional)'}
              </label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="ws_oromia_legal_..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <a
                href="https://publer.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Visit publer.com</span>
                <ExternalLink size={12} />
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  {currentLang === 'om' ? 'Dhiisi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !apiKey.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  {saving && <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                  <span>{currentLang === 'om' ? 'Walitti Hidhi' : 'Connect Publer'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
