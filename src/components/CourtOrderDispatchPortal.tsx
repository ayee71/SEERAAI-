import React, { useState } from 'react';
import { 
  Send, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Landmark, 
  Filter, 
  MessageSquare, 
  ChevronRight,
  UserCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { 
  CourtDispatchOrder, 
  getDispatchOrders, 
  dispatchOrderViaChannel, 
  recordOrderResponse 
} from '../services/courtCaseService';
import { CourtInstitution } from '../services/courtInstitutionService';

interface CourtOrderDispatchPortalProps {
  currentLang: Language;
  courtInstitution?: CourtInstitution;
  onOpenCaseWorkbench?: (caseNumber: string) => void;
}

export const CourtOrderDispatchPortal: React.FC<CourtOrderDispatchPortalProps> = ({
  currentLang,
  courtInstitution,
  onOpenCaseWorkbench
}) => {
  const t = translations[currentLang];
  const [orders, setOrders] = useState<CourtDispatchOrder[]>(() => getDispatchOrders());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_legal_officer' | 'dispatched' | 'response_received'>('all');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Response Intake Modal State
  const [selectedOrderForResponse, setSelectedOrderForResponse] = useState<CourtDispatchOrder | null>(null);
  const [responseChannel, setResponseChannel] = useState<'telegram' | 'email'>('telegram');
  const [respondingEntity, setRespondingEntity] = useState('');
  const [responseRefNo, setResponseRefNo] = useState('');
  const [responseSummary, setResponseSummary] = useState('');
  const [responseSuccessMsg, setResponseSuccessMsg] = useState<string | null>(null);

  // Telegram Preview / Dispatch Modal
  const [telegramDispatchOrder, setTelegramDispatchOrder] = useState<CourtDispatchOrder | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const telegramLink = courtInstitution?.courtTelegramLink || 'https://t.me/OromiaCourtBot';
  const courtEmail = courtInstitution?.courtEmailAddress || courtInstitution?.adminEmail || 'legal.dispatch@oromia.gov.et';

  const handleRefresh = () => {
    setOrders(getDispatchOrders());
  };

  const handleCopyOrderText = (order: CourtDispatchOrder) => {
    const formatted = `🏛️ ${courtInstitution?.customCourtName || order.courtName}\n⚖️ ${order.bench}\nLakk. Bahii: ${order.orderRefNo}\nLakk. Galmee: ${order.caseNumber}\nQaama Ajajameef: ${order.targetPartyName}\n\nAJAJA DHADDACHAA:\n${order.orderText}\n\nGuyyaa Deebiin Eegamu: ${order.deadlineDate || 'Guyyoota 7 keessatti'}\nAbbaa Seeraa: ${order.judgeName}\nChaappaa Mirkaneessaa: Verified Official Record`;
    navigator.clipboard.writeText(formatted);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  const handleDispatchTelegram = (order: CourtDispatchOrder) => {
    const updated = dispatchOrderViaChannel(order.id, 'telegram', 'Ofiisara Seeraa');
    if (updated) {
      setOrders(getDispatchOrders());
      setDispatchSuccessMsg(
        currentLang === 'om'
          ? `Ajajni Lakk. ${order.orderRefNo} gama Telegram tiin milkaa'inaan ergameera!`
          : `Court Order ${order.orderRefNo} dispatched successfully via Telegram!`
      );
      setTimeout(() => setDispatchSuccessMsg(null), 3000);
    }
  };

  const handleDispatchEmail = (order: CourtDispatchOrder) => {
    const updated = dispatchOrderViaChannel(order.id, 'email', 'Ofiisara Seeraa');
    if (updated) {
      setOrders(getDispatchOrders());
      
      const subject = encodeURIComponent(`[AJAJA DHADDACHAA] Lakk. ${order.orderRefNo} - Galmee ${order.caseNumber}`);
      const body = encodeURIComponent(
        `Kabajamoo: ${order.targetPartyName}\n\n` +
        `Mana Murtii: ${courtInstitution?.customCourtName || order.courtName}\n` +
        `Dhaddacha: ${order.bench}\n` +
        `Lakk. Galmee: ${order.caseNumber}\n` +
        `Abbaa Seeraa: ${order.judgeName}\n\n` +
        `QABIYYEE AJAJA DHADDACHAA:\n${order.orderText}\n\n` +
        `Guyyaa Deebiin Eegamu: ${order.deadlineDate || 'Guyyoota 7 keessatti'}\n\n` +
        `Gabaasa ykn bu'aa ajajaa kana kallattiin Email: ${courtEmail} ykn Telegram: ${telegramLink} irratti akka deebiftan beeksisna.\n\n` +
        `Kutaa Ofiisara Seeraa Mana Murtii`
      );
      
      window.open(`mailto:${order.targetPartyContact?.includes('@') ? order.targetPartyContact.split(' ')[0] : ''}?subject=${subject}&body=${body}`, '_blank');
      
      setDispatchSuccessMsg(
        currentLang === 'om'
          ? `Ajajni Lakk. ${order.orderRefNo} gama Email tiin ergameera!`
          : `Court Order ${order.orderRefNo} dispatched via Email!`
      );
      setTimeout(() => setDispatchSuccessMsg(null), 3000);
    }
  };

  const handleSaveResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForResponse || !responseSummary.trim()) return;

    const fullResponseNote = `[Qaama Deebise: ${respondingEntity || selectedOrderForResponse.targetPartyName}] [Lakk. Xalayaa: ${responseRefNo || 'Deebii-01'}] ${responseSummary}`;

    const updated = recordOrderResponse(
      selectedOrderForResponse.id,
      fullResponseNote,
      responseChannel,
      'Ofiisara Seeraa'
    );

    if (updated) {
      setOrders(getDispatchOrders());
      setResponseSuccessMsg(
        currentLang === 'om'
          ? `✅ Bu'aan ajajaa Lakk. ${selectedOrderForResponse.orderRefNo} milkaa'inaan galmee irratti qabameera!`
          : `Compliance report recorded and linked to case docket successfully!`
      );

      setTimeout(() => {
        setResponseSuccessMsg(null);
        setSelectedOrderForResponse(null);
        setRespondingEntity('');
        setResponseRefNo('');
        setResponseSummary('');
      }, 2000);
    }
  };

  const filteredOrders = orders.filter(ord => {
    if (filterStatus === 'all') return true;
    return ord.status === filterStatus;
  });

  const pendingCount = orders.filter(o => o.status === 'pending_legal_officer').length;

  return (
    <div className="space-y-6">
      {/* Official Court Dispatch Header Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-2xl font-bold shrink-0">
              📨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                  Kutaa Ofiisara Seeraa
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Official Judicial Dispatch
                </span>
              </div>
              <h3 className="text-xl font-bold font-serif-legal text-white mt-1">
                {currentLang === 'om' 
                  ? 'Ajaja Dhaddachaa & Dispatch Telegram / Email' 
                  : 'Court Orders & Telegram / Email Dispatch Portal'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentLang === 'om'
                  ? 'Ajajoota abbaan seeraa kenne ofisariin seeraa gama Telegram fi Email mana murtiitiin qaama ajajameef erga; deebii fi bu\'aa ajajaa argamus asitti galmeessa.'
                  : 'Legal Officer transmits judge orders to target parties via official Telegram/Email channels and logs incoming compliance reports.'}
              </p>
            </div>
          </div>

          {/* Court Official Channels Status Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 shrink-0">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-slate-400">Karaalee Ergaa Mana Murtii:</div>
              <div className="flex items-center gap-3 text-xs">
                <a 
                  href={telegramLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition-colors"
                >
                  <span>📱 Telegram Bot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-600">•</span>
                <a 
                  href={`mailto:${courtEmail}`} 
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold transition-colors"
                >
                  <span>📧 {courtEmail}</span>
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Haaromsi (Refresh)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: currentLang === 'om' ? 'Ajajoota Hunda' : 'All Orders', count: orders.length },
              { id: 'pending_legal_officer', label: currentLang === 'om' ? '⏳ Ergamuu Eegaa Jira' : 'Pending Dispatch', count: pendingCount, highlight: pendingCount > 0 },
              { id: 'dispatched', label: currentLang === 'om' ? '🚀 Ergameera (Sent)' : 'Dispatched', count: orders.filter(o => o.status === 'dispatched').length },
              { id: 'response_received', label: currentLang === 'om' ? '✅ Bu\'aan Dhiyaateera' : 'Response Received', count: orders.filter(o => o.status === 'response_received').length },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black ${
                  f.highlight ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {dispatchSuccessMsg && (
            <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{dispatchSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-3xl space-y-2">
            <span className="text-3xl">📭</span>
            <div className="text-sm font-bold text-slate-300">Ajajni dhaddachaa asitti hin argamne</div>
            <p className="text-xs text-slate-500">
              Yeroo abbaan seeraa dhaddacha irratti ajaja kennu, asitti ofiisara seeraatiin ergamuu eega.
            </p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className={`bg-slate-950 border rounded-2xl p-5 space-y-4 shadow-lg transition-all ${
                order.status === 'pending_legal_officer'
                  ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                  : order.status === 'response_received'
                  ? 'border-emerald-500/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      Ref: {order.orderRefNo}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Lakk. Galmee: {order.caseNumber}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                      order.status === 'pending_legal_officer'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : order.status === 'dispatched'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {order.status === 'pending_legal_officer'
                        ? '⏳ Ergamuu Eegaa Jira'
                        : order.status === 'dispatched'
                        ? '🚀 Ergameera (Dispatched)'
                        : '✅ Bu\'aan Dhiyaateera'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {order.orderTitle}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenCaseWorkbench && (
                    <button
                      type="button"
                      onClick={() => onOpenCaseWorkbench(order.caseNumber)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>⚖️ Galmee Bani</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Order Content Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>📜 QABIYYEE AJAJA DHADDACHAA:</span>
                </div>
                <p>{order.orderText}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <div>
                    Qaama Ajajameef: <strong className="text-white">{order.targetPartyName}</strong> ({order.targetPartyType})
                  </div>
                  <div>
                    Abbaa Seeraa: <strong className="text-amber-300">{order.judgeName}</strong> ({order.bench})
                  </div>
                  <div className="font-mono text-emerald-400">
                    📅 Deebiin Eegamu: <strong>{order.deadlineDate || 'Guyyoota 7 keessatti'}</strong>
                  </div>
                </div>
              </div>

              {/* Response Summary If Received */}
              {order.responseSummary && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>BU'AA AJAJAA (COMPLIANCE RESPONSE RECEIVED):</span>
                    {order.responseChannel && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] font-mono uppercase">
                        Gama {order.responseChannel} tiin
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed">{order.responseSummary}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Guyyaa Galmaa'e: {new Date(order.responseReceivedAt || Date.now()).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Action Buttons for Legal Officer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  {/* Copy Order */}
                  <button
                    type="button"
                    onClick={() => handleCopyOrderText(order)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedOrderId === order.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Koppii Ta'eera!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Koppii Godhi</span>
                      </>
                    )}
                  </button>

                  {/* Dispatch via Telegram */}
                  <button
                    type="button"
                    onClick={() => handleDispatchTelegram(order)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>📱 Telegram'n Ergi</span>
                  </button>

                  {/* Dispatch via Email */}
                  <button
                    type="button"
                    onClick={() => handleDispatchEmail(order)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>📧 Email'n Ergi</span>
                  </button>
                </div>

                {/* Record Compliance Response Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForResponse(order);
                    setRespondingEntity(order.targetPartyName);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>📥 Bu'aa Ajajaa Galmeessi</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Record Compliance Response / Bu'aa Ajajaa */}
      {selectedOrderForResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold">
                  📥
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {currentLang === 'om' ? 'Galmee Bu\'aa Ajajaa (Compliance Intake)' : 'Record Order Compliance'}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref: {selectedOrderForResponse.orderRefNo} • Galmee: {selectedOrderForResponse.caseNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForResponse(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {responseSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{responseSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveResponse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Karaa Deebiin Dhiyaate (Channel) *</label>
                  <select
                    value={responseChannel}
                    onChange={e => setResponseChannel(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="telegram">📱 Telegram (@Bot ykn Direct)</option>
                    <option value="email">📧 Email Official Mana Murtii</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Lakk. Xalayaa Deebii (Ref No)</label>
                  <input
                    type="text"
                    value={responseRefNo}
                    onChange={e => setResponseRefNo(e.target.value)}
                    placeholder="fkn. CBE/AD/LEGAL/921/2016"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Qaama Deebii Kennu (Responding Entity) *</label>
                <input
                  type="text"
                  value={respondingEntity}
                  onChange={e => setRespondingEntity(e.target.value)}
                  placeholder="fkn. Commercial Bank of Ethiopia Damee Adaamaa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Qabiyyee & Gabaasa Bu'aa Ajajaa (Response Findings & Summary) *
                </label>
                <textarea
                  rows={4}
                  value={responseSummary}
                  onChange={e => setResponseSummary(e.target.value)}
                  placeholder="fkn. Herregni baankii lakkoofsa 1000284792 irratti maallaqni jiru Birrii 450,000 qoratamee xalayaan dhiyaateera..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForResponse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Dhiisi (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Galmee Irratti Mirkaneessi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtOrderDispatchPortal;
