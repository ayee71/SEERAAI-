import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  PRICING_PLANS, 
  getUserCredits, 
  PaymentTransaction,
  autoGrantPremiumToAllPayingUsers
} from '../services/paymentService';
import { Language, translations } from '../i18n/translations';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { getSyncStatusLabel } from './PaymentView';
import { Shield, Sparkles, Award, FileText, BadgePercent, CheckCircle, RefreshCw, Star, ArrowRight } from 'lucide-react';

interface PremiumSubscriberDashboardViewProps {
  currentLang: Language;
  onNavigateToPayment?: () => void;
}

export const PremiumSubscriberDashboardView: React.FC<PremiumSubscriberDashboardViewProps> = ({
  currentLang,
  onNavigateToPayment,
}) => {
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<number>(5);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Legal Qualification Details from localStorage
  const legalFullName = localStorage.getItem('seera_legal_fullname') || user?.displayName || 'Verified Legal Scholar';
  const legalRole = localStorage.getItem('seera_legal_role') || 'advocate';
  const legalLicenseNo = localStorage.getItem('seera_legal_license_no') || 'N/A';
  const legalInstitution = localStorage.getItem('seera_legal_institution') || 'N/A';
  const isLegalEligible = localStorage.getItem('seera_legal_qual_verified') === 'true';

  const activePlanId = localStorage.getItem('seera_premium_plan') || 'pro';
  const planDetails = PRICING_PLANS.find(p => p.id === activePlanId) || PRICING_PLANS[1];

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // 1. Fetch available legal credits
      const latestCredits = await getUserCredits(user.uid);
      setCredits(latestCredits);

      // 2. Fetch their payment transactions directly from the user's Firestore document (profile)
      if (profile && profile.paymentHistory && Array.isArray(profile.paymentHistory) && profile.paymentHistory.length > 0) {
        const list = profile.paymentHistory.map((item: any) => ({
          ...item,
          createdAt: item.createdAt,
        } as PaymentTransaction));

        // Sort client-side by date descending
        list.sort((a: PaymentTransaction, b: PaymentTransaction) => {
          const tA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0)).getTime();
          const tB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0)).getTime();
          return tB - tA;
        });

        setTransactions(list);
      } else if (db) {
        // Fallback: Query the standalone payment_transactions collection
        const q = query(
          collection(db, 'payment_transactions'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentTransaction));
        
        // Sort client-side by date descending to avoid index errors
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds 
            ? a.createdAt.seconds * 1000 
            : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime());
          const tB = b.createdAt?.seconds 
            ? b.createdAt.seconds * 1000 
            : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime());
          return tB - tA;
        });
        
        setTransactions(list);
      } else {
        // Fallback to local logs
        const raw = localStorage.getItem('seera_payment_audit_logs');
        if (raw) {
          const parsed = JSON.parse(raw);
          const formatted = parsed.map((item: any) => ({
            transactionReference: item.ref,
            amountETB: item.amountETB || 350,
            planId: item.planId || 'pro',
            createdAt: item.timestamp,
            paymentMethod: item.paymentMethod || 'telebirr',
            status: item.status || 'completed',
            syncStatus: item.syncStatus || 'VERIFIED',
          } as any));
          setTransactions(formatted);
        }
      }
    } catch (e) {
      console.warn('Dashboard data fetch warning:', e);
      // Fallback local load
      const raw = localStorage.getItem('seera_payment_audit_logs');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const formatted = parsed.map((item: any) => ({
            transactionReference: item.ref,
            amountETB: item.amountETB || 350,
            planId: item.planId || 'pro',
            createdAt: item.timestamp,
            paymentMethod: item.paymentMethod || 'telebirr',
            status: item.status || 'completed',
            syncStatus: item.syncStatus || 'VERIFIED',
          } as any));
          setTransactions(formatted);
        } catch {}
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.uid, profile?.paymentHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleDownloadInvoice = (tx: PaymentTransaction) => {
    const amount = tx.amountETB || 350;
    const statusInfo = getSyncStatusLabel(tx.syncStatus || tx.status, currentLang);
    const formattedDate = tx.createdAt?.toDate 
      ? tx.createdAt.toDate().toLocaleDateString() 
      : (typeof tx.createdAt === 'string' ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString());

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SeeraAI Invoice - ${tx.transactionReference}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
    .invoice-box { max-width: 800px; margin: auto; padding: 40px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 900; color: #0f172a; }
    .meta { text-align: right; font-size: 13px; color: #64748b; }
    .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 30px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    th { background: #f1f5f9; color: #334155; font-weight: bold; }
    .total { text-align: right; font-size: 16px; font-weight: bold; color: #0f172a; }
    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div>
        <div class="logo">⚖️ SeeraAI Legal Tech</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Addis Ababa, Ethiopia | www.saorethio1.com</div>
      </div>
      <div class="meta">
        <div><strong>Invoice Reference:</strong> ${tx.transactionReference}</div>
        <div><strong>Date:</strong> ${formattedDate}</div>
        <div><strong>Status:</strong> ${statusInfo.statusText} (${statusInfo.label})</div>
      </div>
    </div>
    
    <div class="title">Monthly Subscription & Professional Services Invoice</div>
    
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Billing Cycle</th>
          <th>Amount (ETB)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>SeeraAI Professional Legal Research & Courtroom Assistant License (${planDetails.name[currentLang] || planDetails.name.en})</td>
          <td>Monthly Subscription</td>
          <td>${amount}.00 ETB</td>
        </tr>
      </tbody>
    </table>
    
    <div class="total">
      Total Settled: ${amount}.00 ETB (Tax Included)
    </div>
    
    <div class="footer">
      <p>Thank you for using SeeraAI - Trilingual Ethiopian Legal Research & Courtroom Assistant Platform.</p>
      <p>This is a system-generated invoice conforming to Ethiopian legal and digital transaction standards.</p>
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SeeraAI_Invoice_${tx.transactionReference}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      advocate: currentLang === 'om' ? 'Abukaattoo (Advocate)' : currentLang === 'am' ? 'ጠበቃ (Advocate)' : 'Licensed Advocate',
      judge: currentLang === 'om' ? 'Abbaa Seeraa (Judge)' : currentLang === 'am' ? 'ዳኛ (Judge)' : 'Judicial Officer',
      prosecutor: currentLang === 'om' ? 'Abbaa Alangaa' : currentLang === 'am' ? 'ዓቃቤ ሕግ' : 'Prosecutor',
      professor: currentLang === 'om' ? 'Barsiisaa Seeraa' : currentLang === 'am' ? 'የህግ መምህር' : 'Law Professor',
      student: currentLang === 'om' ? 'Barataa Seeraa' : currentLang === 'am' ? 'የህግ ተማሪ' : 'Law Student',
    };
    return roles[role] || role;
  };

  if (!isLegalEligible) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-3xl">
          🔒
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-100 font-serif-legal">
            {currentLang === 'om' ? 'Ulaagaa Ogummaa Seeraa Mirkaneessuu' : currentLang === 'am' ? 'የህግ ባለሙያነት ማረጋገጫ' : 'Legal Professional Verification Required'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {currentLang === 'om'
              ? 'Tajaajila premium fayyadamuuf fi gabatee bulchiinsaa kana arguuf, duraan dursanii ulaagaalee seeraa fi eeyyama ogummaa keessan mirkaneessuun dirqama.'
              : currentLang === 'am'
              ? 'የፕሪሚየም አገልግሎቶችን ለመጠቀም እና ይህንን ዳሽቦርድ ለመመልከት፣ በመጀመሪያ የህግ ባለሙያነት መመዘኛዎችን ማረጋገጥ ግዴታ ነው።'
              : 'To access the premium subscriber dashboard and services, you must first complete your professional legal accreditation and ethics verification.'}
          </p>
        </div>
        <button
          onClick={onNavigateToPayment}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow transition-all flex items-center justify-center gap-2"
        >
          <span>⚖️</span>
          <span>{currentLang === 'om' ? 'Ulaagaa Ogummaa Mirkaneessi' : currentLang === 'am' ? 'የሙያ መረጃዎችን አረጋግጥ' : 'Verify Professional Status'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Dashboard Premium Title */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-7xl opacity-10 pointer-events-none font-serif select-none">
          👑
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <span>👑</span>
              <span>
                {currentLang === 'om' ? 'Miseensummaa Premium' : currentLang === 'am' ? 'የፕሪሚየም ተመዝጋቢ ዳሽቦርድ' : 'Premium Subscriber Dashboard'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3.5xl font-serif-legal font-bold text-slate-100 leading-tight">
              {currentLang === 'om' ? 'Dabaree Bulchiinsa Miseensummaa Keessanii' : currentLang === 'am' ? 'የፕሪሚየም የህግ አገልግሎት አስተዳደር' : 'Your Premium Legal Scholar Hub'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {currentLang === 'om'
                ? 'Kutaa kanaan miseensummaa premium keessan to\'achuu, ragaalee kaffaltii mirkanaa\'an ilaaluu, herrega daldalaa, fi ulaagaalee seeraa guuttan hordofuu dandeessu.'
                : currentLang === 'am'
                ? 'በዚህ ገጽ የፕሪሚየም ደንበኝነትዎን ሁኔታ ማስተዳደር፣ የተረጋገጡ ክፍያዎችን ታሪክ መከታተል፣ የአገልግሎት ኮታዎችን ማየት እና ያረጋገጧቸውን የሙያ መረጃዎች መከታተል ይችላሉ።'
                : 'Manage your active subscription, monitor legal document creation quotas, view historical carrier receipts, and review verified legal professional accreditations.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50 shrink-0"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Quota, Subscription & License Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Current Plan Tier card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg">
              👑
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
              {currentLang === 'om' ? 'Kallattii' : currentLang === 'am' ? 'ገባሪ' : 'Active'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">
              {currentLang === 'om' ? 'Karoora Miseensummaa' : currentLang === 'am' ? 'የደንበኝነት አይነት' : 'Subscription Tier'}
            </span>
            <h3 className="text-xl font-serif-legal font-black text-slate-100 mt-1">
              {planDetails.name[currentLang] || planDetails.name.en}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {planDetails.description[currentLang] || planDetails.description.en}
            </p>
          </div>
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{currentLang === 'om' ? 'Kaffaltii Baatii:' : currentLang === 'am' ? 'ወርሃዊ ክፍያ፦' : 'Monthly Fee:'}</span>
            <span className="font-bold text-amber-300 font-mono text-sm">{planDetails.priceETB} ETB</span>
          </div>
        </div>

        {/* Quotas & Credit Balance card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-lg">
              📄
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
              {currentLang === 'om' ? 'Eeyyamame' : currentLang === 'am' ? 'የተፈቀደ' : 'Permitted'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">
              {currentLang === 'om' ? 'Sanada & Quota AI' : currentLang === 'am' ? 'የሰነድ እና የ AI ኮታ' : 'Document & AI Quota'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {credits === 999999 ? '∞' : credits}
              </span>
              <span className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Haftee Gaaffii' : currentLang === 'am' ? 'ጥያቄዎች ቀርተዋል' : 'Queries Remaining'}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-3 border border-slate-850">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: credits === 999999 ? '100%' : `${Math.min(100, (credits / planDetails.credits) * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed italic pt-1">
            {currentLang === 'om'
              ? '* Gaaffiin AI tokko hojii qorannoo, qophii waliigaltee, ykn xiinxala sanada tokkoof tajaajila.'
              : '* እያንዳንዱ የ AI ጥያቄ ለአንድ የሰነድ ዝግጅት፣ የህግ ምርምር ወይም ሰነድ ትንተና አገልግሎት ላይ ይውላል።'}
          </div>
        </div>

        {/* Legal Accreditations card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-lg">
              🛡️
            </div>
            <span className="text-[10px] font-mono uppercase bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
              {currentLang === 'om' ? 'Dhugoomame' : currentLang === 'am' ? 'የተረጋገጠ' : 'Verified'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">
              {currentLang === 'om' ? 'Eeyyama Ogummaa Seeraa' : currentLang === 'am' ? 'የህግ ሙያ ማረጋገጫ' : 'Legal Professional Verification'}
            </span>
            <div className="text-slate-100 font-serif-legal font-bold text-sm mt-2 truncate">
              👤 {legalFullName}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
              <p>📍 <span className="font-bold">{currentLang === 'om' ? 'Ogummaa:' : 'ዘርፍ፦'}</span> {getRoleLabel(legalRole)}</p>
              <p>🆔 <span className="font-bold">{currentLang === 'om' ? 'Lakk. Eeyyamaa:' : 'የፈቃድ ቁጥር፦'}</span> <span className="font-mono text-amber-300">{legalLicenseNo}</span></p>
              <p>🏢 <span className="font-bold">{currentLang === 'om' ? 'Dhaabbata:' : 'ተቋም፦'}</span> {legalInstitution}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History of Verified Payments */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-100 font-serif-legal flex items-center gap-2">
            <span>📜</span>
            <span>
              {currentLang === 'om' ? 'Seenaa Kaffaltii (Payment History)' : currentLang === 'am' ? 'የክፍያ ታሪክ' : 'Payment History'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {currentLang === 'om'
              ? 'Kaffaltiiwwan herrega Telebirr, Safaricom M-Pesa fi herrega daldalaa irratti raawwatanii sirnaan mirkanaa\'an hundumaa asitti argattu.'
              : currentLang === 'am'
              ? 'በቴሌብር፣ በሳፋሪኮም ወይም በባንክ የተፈጸሙና በስርዓቱ የተረጋገጡ የክፍያ ታሪኮች ዝርዝር በደረሰኝ ማውረጃ ቁልፍ ጋር።'
              : 'Review your complete history of past subscription transactions, payment status, and enactment dates fetched directly from Firestore.'}
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-mono">Loading payment records...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950 border border-slate-850/60 text-center space-y-3">
            <div className="text-3xl text-slate-600">📜</div>
            <p className="text-xs text-slate-400 italic">
              {currentLang === 'om'
                ? 'Hanga ammaatti seenaan kaffaltii galmaa\'e hin jiru. Kaffaltii raawwachuuf gara gabatee kaffaltii deemaa.'
                : currentLang === 'am'
                ? 'እስካሁን ምንም የተረጋገጠ ክፍያ የለም። እቅድ ለመግዛትና ክፍያ ለመመዝገብ ወደ ክፍያ ገጽ ይሂዱ።'
                : 'No subscription payment history has been recorded yet on Firestore.'}
            </p>
            {onNavigateToPayment && (
              <button
                type="button"
                onClick={onNavigateToPayment}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-serif-legal shadow transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <span>💳</span>
                <span>{currentLang === 'om' ? 'Kaffaltii Raawwadhu' : currentLang === 'am' ? 'ክፍያ ፈጽም' : 'Upgrade Plan'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="pb-3 pl-4">
                    {currentLang === 'om' ? 'Kaffaltii Ref' : currentLang === 'am' ? 'የክፍያ ማጣቀሻ' : 'Payment Ref'}
                  </th>
                  <th className="pb-3">
                    {currentLang === 'om' ? 'Guyyaa' : currentLang === 'am' ? 'ቀን' : 'Date'}
                  </th>
                  <th className="pb-3">
                    {currentLang === 'om' ? 'Qabeenya (Plan)' : currentLang === 'am' ? 'ፓኬጅ' : 'Plan'}
                  </th>
                  <th className="pb-3">
                    {currentLang === 'om' ? 'Gatii' : currentLang === 'am' ? 'ክፍያ' : 'Amount'}
                  </th>
                  <th className="pb-3">
                    {currentLang === 'om' ? 'Haala' : currentLang === 'am' ? 'ሁኔታ' : 'Status'}
                  </th>
                  <th className="pb-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {transactions.map((tx) => {
                  const statusInfo = getSyncStatusLabel(tx.syncStatus || tx.status, currentLang);
                  const formattedDate = tx.createdAt?.toDate 
                    ? tx.createdAt.toDate().toLocaleDateString() 
                    : (typeof tx.createdAt === 'string' ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString());

                  const currentPlan = PRICING_PLANS.find(p => p.id === tx.planId) || PRICING_PLANS[1];

                  return (
                    <tr key={tx.transactionReference} className="hover:bg-slate-950/40 transition">
                      <td className="py-4 pl-4 font-mono font-bold text-amber-300">
                        {tx.transactionReference}
                      </td>
                      <td className="py-4 text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="py-4 font-medium text-slate-200">
                        {currentPlan.name[currentLang] || currentPlan.name.en}
                      </td>
                      <td className="py-4 font-bold text-slate-100 font-mono">
                        {tx.amountETB || currentPlan.priceETB} ETB
                      </td>
                      <td className="py-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${statusInfo.badgeClass}`}>
                          <span>{statusInfo.icon}</span>
                          <span>{statusInfo.statusText}</span>
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(tx)}
                          className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 transition-all font-mono font-semibold text-[10px] cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>📥</span>
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exclusive Premium Privileges Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-7xl opacity-5 pointer-events-none font-serif select-none">
          ✨
        </div>
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-100 font-serif-legal flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>
              {currentLang === 'om' ? 'Faayidaaleen Addaa Miseensummaa Premium (Exclusive Benefits)' : 'የፕሪሚየም ተጠቃሚነት ልዩ ጥቅሞች (Exclusive Benefits)'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Miseensummaan premium keessan tajaajilota qabatamaa ogummaa seeraa hiixatan hundumaa banee gargaara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              🤖
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">
                {currentLang === 'om' ? 'Model Qorannoo Deep Thinking' : 'የላቀ የህግ አስተሳሰብ AI (Deep Thinking)'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Xiinxala seeraa gad-fagoo (Gemini reasoning engine) fayyadamuun falmii mana murtii qopheessuu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              📝
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">
                {currentLang === 'om' ? 'Chaappaa fi Maqaa Biiroo' : 'የድርጅት ስም ማህተምና ብራንዲንግ'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sanadoota draft gootan hundumaa irratti maqaa biiroo keessanii fi chaappaa dijitaalaa (logo) itti dabaluu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              🏛️
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">
                {currentLang === 'om' ? 'Automashinii Sadarkaa Sadii' : 'የሦስቱ ፍርድ ቤቶች ደረጃዎች ሙሉ መዳረሻ'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Hojii jalqabaa, ol-iyyataa, fi ijibbaataa battalatti dhimmoota qorachuu fi unka iyyannoo bifa lamatiin baasuu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              📞
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">
                {currentLang === 'om' ? 'Gargaarsa Teeknikaa Duraa' : 'የቅድሚያ የቴክኒክ ድጋፍ (Priority Support)'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gaaffilee fi yaada keessaniif sa\'aatii 24 keessatti abbaa kalaqaa irraa gargaarsa argachuu.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
