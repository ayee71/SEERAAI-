import React from 'react';
import { PaymentTransaction } from '../services/paymentService';

interface PaymentReceiptProps {
  transaction: PaymentTransaction;
  onClose: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ transaction, onClose }) => {
  const isCompleted = transaction.status === 'completed';
  const amount = transaction.amountETB || 100;
  
  // Calculate VAT (15%) and Net Settled Amount according to Ethiopian Revenue standards
  const vatAmount = Number((amount * 0.15 / 1.15).toFixed(2));
  const settledAmount = Number((amount - vatAmount).toFixed(2));
  
  // Convert amount to words
  const getAmountInWords = (amt: number) => {
    if (amt === 100) return 'One Hundred Birr only / አንድ መቶ ብር ብቻ';
    if (amt === 350) return 'Three Hundred Fifty Birr only / ሶስት መቶ አምሳ ብር ብቻ';
    if (amt === 950) return 'Nine Hundred Fifty Birr only / ዘጠኝ መቶ አምሳ ብር ብቻ';
    return `${amt} Birr only / ${amt} ብር ብቻ`;
  };

  const getReason = (amt: number) => {
    if (amt === 100) return 'pre-paid Customer Airtime Top-up / የቅድመ ክፍያ ደንበኛ የአየር ሰዓት መሙያ';
    return 'SeeraAI Premium Scholar Access / የSeeraAI ፕሪሚየም የህግ ምርምር አገልግሎት';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative my-8 font-sans">
        
        {/* TOP BANNER / LOGO */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-slate-300 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇪🇹</span>
            <div>
              <div className="text-emerald-600 font-black text-lg tracking-wider">ethio telecom</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">telebirr payment receipt</div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isCompleted ? '✓ Completed / የተጠናቀቀ' : '⏳ Pending / በመጠባበቅ ላይ'}
            </div>
          </div>
        </div>

        {/* RECEIPT HEADER */}
        <div className="text-center space-y-1 mb-6">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {amount === 100 ? 'pre-paid Customer Airtime Top-up' : 'SeeraAI Premium Access Receipt'}
          </h2>
          <p className="text-xs text-slate-500 font-semibold font-mono">
            የቅድመ ክፍያ ደንበኛ የአየር ሰዓት / የደንበኝነት መሙያ ደረሰኝ
          </p>
        </div>

        {/* TRANSACTION METADATA */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
          <div className="grid grid-cols-2">
            <span className="text-slate-500 font-medium">Payer Name / የከፋይ ስም:</span>
            <span className="text-slate-900 font-bold text-right">{transaction.userName}</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="text-slate-500 font-medium">Payer Telebirr No / የከፋይ ቁጥር:</span>
            <span className="text-slate-900 font-mono font-bold text-right">
              {transaction.userEmail ? `${transaction.userEmail.split('@')[0]} (telebirr)` : '0912***456'}
            </span>
          </div>
          <div className="grid grid-cols-2">
            <span className="text-slate-500 font-medium">Account Type / አካውንት አይነት:</span>
            <span className="text-slate-900 font-bold text-right">Individual Customer / የግል ደንበኛ</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="text-slate-500 font-medium">Credited Party / ተቀባይ ስም:</span>
            <span className="text-slate-900 font-bold text-right">SeeraAI (Ayele Belayneh Zeleke)</span>
          </div>
        </div>

        {/* DETAILS TABLE */}
        <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3">Payment Details / የክፍያ ዝርዝር</th>
                <th className="p-3 text-right">Amount (ETB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="p-3 font-medium">
                  <div>Settled Amount / የተከፈለው መጠን</div>
                  <div className="text-[10px] text-slate-400">Exclusive of 15% VAT</div>
                </td>
                <td className="p-3 text-right font-mono font-bold">{settledAmount}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Discount Amount / ቅናሽ</td>
                <td className="p-3 text-right font-mono text-slate-400">0.00</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">VAT (15%) / ተ.እ.ታ (15%)</td>
                <td className="p-3 text-right font-mono font-bold">{vatAmount}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Stamp Duty / የማህተም ክፍያ</td>
                <td className="p-3 text-right font-mono text-slate-400">0.00</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Service Fee / የአገልግሎት ክፍያ</td>
                <td className="p-3 text-right font-mono text-slate-400">0.00</td>
              </tr>
              <tr className="bg-emerald-50/50 font-extrabold text-slate-900 text-sm">
                <td className="p-3">Total Paid Amount / ጠቅላላ የተከፈለ:</td>
                <td className="p-3 text-right font-mono text-emerald-600">{amount}.00 ETB</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AMOUNT IN WORDS & TRANSACTION INFO */}
        <div className="mt-4 space-y-3.5 text-xs border-b border-dashed border-slate-200 pb-4">
          <div className="space-y-0.5">
            <span className="text-slate-500 font-medium block">Total Amount in Words / የገንዘቡ ልክ በፊደል:</span>
            <span className="text-slate-900 font-extrabold italic block">{getAmountInWords(amount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-2">
            <div>
              <span className="text-slate-500 font-medium block">Receipt No. / የክፍያ ቁጥር:</span>
              <span className="text-slate-900 font-mono font-black text-xs uppercase tracking-wider">{transaction.transactionReference}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block">Payment Date / የክፍያ ቀን:</span>
              <span className="text-slate-900 font-mono font-bold">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Payment Mode / የክፍያ ዘዴ:</span>
              <span className="text-slate-900 font-bold uppercase font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">telebirr</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block">Payment Channel / መንገድ:</span>
              <span className="text-slate-900 font-bold font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">APP</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 font-medium block">Payment Reason / የክፍያ ምክንያት:</span>
            <span className="text-slate-900 font-bold block">{getReason(amount)}</span>
          </div>
        </div>

        {/* VERIFICATION SIGNATURE / STAMP & QR CODE */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Authorized Digital Signature</div>
            {/* Round Ink Digital Stamp */}
            <div className="w-24 h-24 rounded-full border-4 border-double border-emerald-600/65 flex flex-col items-center justify-center p-1.5 text-center select-none rotate-[-6deg] bg-emerald-50/20">
              <span className="text-[7px] text-emerald-600/90 font-black uppercase tracking-tight leading-none">Ethio Telecom</span>
              <span className="text-[6px] text-emerald-600/80 font-bold mt-0.5 leading-none">telebirr</span>
              <span className="text-[8px] text-emerald-700 font-black tracking-widest my-0.5">APPROVED</span>
              <span className="text-[6px] text-emerald-600/80 font-bold leading-none">{new Date().getFullYear()}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification QR Code</div>
            {/* Elegant simulated QR Code */}
            <div className="inline-block p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-slate-900 flex flex-col items-center justify-center text-white text-[9px] font-mono leading-none p-1.5 rounded gap-1">
                <span className="text-xs">📱</span>
                <span className="text-[7px] font-bold text-center text-slate-300">SCAN TO VERIFY</span>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER NOTE */}
        <div className="mt-6 text-center text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-4 leading-relaxed">
          Thank you for using telebirr! Ethio telecom VAT No. 12903847, TIN 0001928471.<br />
          For support contact 127. SeeraAI Legal Tech Support: support@saiethio.com
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-slate-900 text-white hover:bg-slate-850 font-bold rounded-xl transition duration-200 text-xs tracking-wider uppercase shadow-md cursor-pointer"
        >
          Cufi / Close Receipt
        </button>
      </div>
    </div>
  );
};

