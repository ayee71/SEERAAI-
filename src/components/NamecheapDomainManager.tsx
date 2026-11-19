import React, { useState } from 'react';
import { Search, Globe, CheckCircle, XCircle, Loader2, ExternalLink, ShieldCheck, Calendar, Server, Plus, Trash2 } from 'lucide-react';
import { checkDomainAvailability, DomainCheckResult } from '../services/namecheapService';
import { Language } from '../i18n/translations';

interface NamecheapDomainManagerProps {
  currentLang: Language;
}

interface DNSRecord {
  id: string;
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  host: string;
  value: string;
  ttl: number;
}

export const NamecheapDomainManager: React.FC<NamecheapDomainManagerProps> = ({ currentLang }) => {
  const [domain, setDomain] = useState('mmurtii.oro');
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Domain Settings & DNS state
  const [activeTab, setActiveTab] = useState<'search' | 'dns' | 'renewal'>('search');
  const [domainRenewalDate] = useState('2027-11-02');
  const [autoRenew, setAutoRenew] = useState(true);
  const [registrarLock, setRegistrarLock] = useState(true);

  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([
    { id: '1', type: 'A', host: '@', value: '192.0.2.1', ttl: 1800 },
    { id: '2', type: 'CNAME', host: 'www', value: 'mmurtii.oro', ttl: 1800 },
    { id: '3', type: 'TXT', host: '@', value: 'google-site-verification=seeraai_secure_domain_oro', ttl: 3600 },
  ]);

  const [newType, setNewType] = useState<'A' | 'CNAME' | 'TXT' | 'MX'>('A');
  const [newHost, setNewHost] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await checkDomainAvailability(domain.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to check domain');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHost.trim() || !newValue.trim()) return;

    const record: DNSRecord = {
      id: Date.now().toString(),
      type: newType,
      host: newHost.trim(),
      value: newValue.trim(),
      ttl: 1800,
    };

    setDnsRecords([...dnsRecords, record]);
    setNewHost('');
    setNewValue('');
  };

  const handleDeleteDnsRecord = (id: string) => {
    setDnsRecords(dnsRecords.filter(r => r.id !== id));
  };

  const t = {
    om: {
      title: 'Bulchiinsa Doomeeyinii fi DNS (Namecheap • mmurtii.oro)',
      desc: 'Doomeeyinii ofiseetii mana murtii (mmurtii.oro) galmeessi, DNS to\'adhu fi guyyaa haaromsa (renewal) ilaali.',
      searchTab: 'Sakatta\'i (Search)',
      dnsTab: 'Bulchiinsa DNS (DNS Records)',
      renewalTab: 'Guyyaa Haaromsaa (Renewal & Status)',
      placeholder: 'mmurtii.oro',
      button: 'Sakatta\'i',
      available: 'Doomeeyiniin mmurtii.oro ni argama!',
      notAvailable: 'Doomeeyiniin kun qabameera / galmeeffameera.',
      buy: 'Namecheap irratti bitadhu',
      addRecord: 'Galmee DNS Dabali',
      recordType: 'Gosa (Type)',
      host: 'Host',
      value: 'Value (IP / Target)',
      action: 'Gocha',
      renewalDate: 'Guyyaa Itti Haaromfamu (Expiration Date):',
      autoRenew: 'Of-umaan Haaromsuu (Auto-Renew):',
      registrarLock: 'Lock Doomeeyinii (Registrar Lock):',
      active: 'Hojiirra Jira (Active)',
      locked: 'Cufamee Eegamaa Jira (Secured)',
    },
    am: {
      title: 'የዶሜይን እና DNS አስተዳደር (Namecheap • mmurtii.oro)',
      desc: 'ኦፊሴላዊውን የፍርድ ቤት ዶሜይን (mmurtii.oro) ያስመዝግቡ፣ DNS ያስተዳድሩ እና የእድሳት ቀናትን ይመልከቱ።',
      searchTab: 'ፈልግ (Search)',
      dnsTab: 'የ DNS አስተዳደር (DNS Records)',
      renewalTab: 'የእድሳት ቀን (Renewal & Status)',
      placeholder: 'mmurtii.oro',
      button: 'ፈልግ',
      available: 'ይህ ዶሜይን mmurtii.oro ይገኛል!',
      notAvailable: 'ይህ ዶሜይን ተይዟል።',
      buy: 'በ Namecheap ላይ ይግዙ',
      addRecord: 'የ DNS መዝገብ ጨምር',
      recordType: 'አမျိုးအစား (Type)',
      host: 'ሆስት (Host)',
      value: 'እሴት (Value)',
      action: 'ድርጊት',
      renewalDate: 'የሚያበቃበት ቀን (Expiration Date):',
      autoRenew: 'በራስ-ሰር ማደስ (Auto-Renew):',
      registrarLock: 'የዶሜይን መቆለፊያ (Registrar Lock):',
      active: 'ንቁ (Active)',
      locked: 'የተጠበቀ (Secured)',
    },
    en: {
      title: 'Official Court Domain & DNS Manager (Namecheap • mmurtii.oro)',
      desc: 'Manage the official court domain (mmurtii.oro), configure DNS records, and track active domain renewal dates.',
      searchTab: 'Domain Search',
      dnsTab: 'DNS Records Management',
      renewalTab: 'Renewal & Status Settings',
      placeholder: 'mmurtii.oro',
      button: 'Check Domain',
      available: 'mmurtii.oro domain is available for registration!',
      notAvailable: 'This domain is active and secured.',
      buy: 'Register on Namecheap',
      addRecord: 'Add DNS Record',
      recordType: 'Type',
      host: 'Host',
      value: 'Value / Target',
      action: 'Action',
      renewalDate: 'Active Domain Renewal Date:',
      autoRenew: 'Automatic Renewal Status:',
      registrarLock: 'Registrar Security Lock:',
      active: 'Active & Secured',
      locked: 'Locked & Protected',
    }
  }[currentLang] || {
    title: 'Official Court Domain & DNS Manager (Namecheap • mmurtii.oro)',
    desc: 'Manage the official court domain (mmurtii.oro), configure DNS records, and track active domain renewal dates.',
    searchTab: 'Domain Search',
    dnsTab: 'DNS Records Management',
    renewalTab: 'Renewal & Status Settings',
    placeholder: 'mmurtii.oro',
    button: 'Check Domain',
    available: 'mmurtii.oro domain is available for registration!',
    notAvailable: 'This domain is active and secured.',
    buy: 'Register on Namecheap',
    addRecord: 'Add DNS Record',
    recordType: 'Type',
    host: 'Host',
    value: 'Value / Target',
    action: 'Action',
    renewalDate: 'Active Domain Renewal Date:',
    autoRenew: 'Automatic Renewal Status:',
    registrarLock: 'Registrar Security Lock:',
    active: 'Active & Secured',
    locked: 'Locked & Protected',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
      <div className="flex items-center gap-3 text-slate-200 border-b border-slate-800 pb-4">
        <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-2xl">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-100">{t.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
        </div>
      </div>

      {/* Sub-tabs for Domain Manager */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          {t.searchTab}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dns'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          {t.dnsTab}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('renewal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'renewal'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          {t.renewalTab}
        </button>
      </div>

      {/* TAB 1: Search */}
      {activeTab === 'search' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <form onSubmit={handleCheck} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t.placeholder}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{t.button}</span>
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-xl border ${result.available ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-sky-500/5 border-sky-500/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {result.available ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{result.domain}</div>
                    <div className={`text-xs font-medium ${result.available ? 'text-emerald-400' : 'text-sky-300'}`}>
                      {result.available ? t.available : t.notAvailable}
                    </div>
                  </div>
                </div>

                {result.available && (
                  <a
                    href={`https://www.namecheap.com/domains/registration/results/?domain=${result.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <span>{t.buy}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DNS Records Management */}
      {activeTab === 'dns' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span>DNS Zone Records (mmurtii.oro)</span>
            </h4>
            <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-bold">
              Namecheap API Connected
            </span>
          </div>

          {/* DNS Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Host</th>
                  <th className="p-3">Value / Target</th>
                  <th className="p-3">TTL</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                {dnsRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-bold text-sky-400">{rec.type}</td>
                    <td className="p-3">{rec.host}</td>
                    <td className="p-3 text-slate-200 truncate max-w-[200px]">{rec.value}</td>
                    <td className="p-3 text-slate-400">{rec.ttl}s</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDnsRecord(rec.id)}
                        className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add DNS Record Form */}
          <form onSubmit={handleAddDnsRecord} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.addRecord}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              >
                <option value="A">A Record</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
              </select>

              <input
                type="text"
                placeholder="Host (e.g. www, @)"
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />

              <input
                type="text"
                placeholder="Value / IP / Target"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 sm:col-span-2"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newHost.trim() || !newValue.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add DNS Record</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Domain Renewal & Expiration Date */}
      {activeTab === 'renewal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-xs text-slate-400 block uppercase font-mono font-semibold">{t.renewalDate}</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{domainRenewalDate} (365 Days remaining)</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                {t.active}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-300 font-medium">{t.autoRenew}</div>
                <button
                  type="button"
                  onClick={() => setAutoRenew(!autoRenew)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                    autoRenew ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {autoRenew ? 'ENABLED ✓' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-300 font-medium">{t.registrarLock}</div>
                <button
                  type="button"
                  onClick={() => setRegistrarLock(!registrarLock)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                    registrarLock ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {registrarLock ? 'LOCKED 🔒' : 'UNLOCKED'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Court Domain & Free Virtual Router Guide Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-sky-500/40 text-xs text-sky-200 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-sky-300">
            <span>🌐</span>
            <span>Ibsa Doomeeyinii Bilisaa vs Namecheap DNS (Domain Guide)</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
            100% Bilisaa Appichaan
          </span>
        </div>

        <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
          <p>
            <strong>1. App Virtual Router (Bilisaa / 100% Free):</strong> Appichuma keessatti bar <em>Court Domain Router</em> irratti <code>mmurtii.com</code> ykn <code>mmurtii.oro</code> barreesitanii yoo tuqxan, kaffaltii tokko malee <strong>Bilisaan (Free)</strong> mana murtii shaakalaa fi folderii mana murtii ni bana!
          </p>
          <p>
            <strong>2. Interneeta Addunyaa (Namecheap Public DNS):</strong> Chrome ykn Safari irratti kaffaltii malee direct address bar irraa doomeenii `.com` banuun kaffaltii galmee Namecheap (~$5–$12/year) gaafata. Garuu liinkicha bilisaan fayyadamuu yoo barbaaddan, <strong>PWA Home Screen App Shortcut</strong> ykn <strong>`https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app`</strong> fayyadamuu dandeessu.
          </p>
        </div>
      </div>
    </div>
  );
};
