import React, { useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Star, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';



interface AIFeedbackFloatingButtonProps {
  currentLang: Language;
}

export const AIFeedbackFloatingButton: React.FC<AIFeedbackFloatingButtonProps> = ({ currentLang }) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [category, setCategory] = useState<'ai_inaccuracy' | 'hallucinated_article' | 'missing_law' | 'translation_error' | 'other'>('ai_inaccuracy');
  const [contentType, setContentType] = useState('explain_law');
  const [aiPromptQuery, setAiPromptQuery] = useState('');
  const [reportedInaccuracy, setReportedInaccuracy] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [rating, setRating] = useState(3);
  const [contactEmail, setContactEmail] = useState(user?.email || (profile as any)?.email || '');

  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reportedInaccuracy.trim()) {
      setErrorMessage(
        isOm 
          ? 'Maaloo gabaasa dogoggoraa bal\'inaan ibsaa.' 
          : isAm 
          ? 'እባክዎ የተሳሳተውን የሕግ መረጃ በዝርዝር ይግለጹ።' 
          : 'Please describe the reported inaccuracy in detail.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackPayload = {
        userId: user?.uid || auth.currentUser?.uid || 'guest_visitor_' + Math.random().toString(36).substring(2, 8),
        userEmail: contactEmail.trim() || user?.email || 'anonymous',
        userName: profile?.visitorName || user?.displayName || 'App User',
        category,
        contentType,
        aiPromptQuery: aiPromptQuery.trim(),
        reportedInaccuracy: reportedInaccuracy.trim(),
        suggestedCorrection: suggestedCorrection.trim(),
        rating,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'user_feedback'), feedbackPayload);

      setSubmitSuccess(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
        setReportedInaccuracy('');
        setSuggestedCorrection('');
        setAiPromptQuery('');
      }, 2500);

    } catch (err: any) {
      console.error('Failed to store user feedback:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'user_feedback');
      } catch (processedErr: any) {
        setErrorMessage(
          isOm 
            ? 'Gabaasa erguun hin milkaofne. Maaloo irra deebitanii yaala' 
            : 'መረጃውን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      {/* Floating Feedback Trigger Button (Bottom-Right Corner) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Report AI Inaccuracy"
        title="Report AI Inaccuracy / Yaada SeeraAI"
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-2xl p-3.5 sm:px-4 sm:py-3 rounded-full border-2 border-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
      >
        <AlertTriangle className="w-5 h-5 text-slate-950 group-hover:rotate-12 transition-transform shrink-0" />
        <span className="hidden sm:inline text-xs tracking-tight font-extrabold">
          {isOm ? 'Gabaasa Dogoggora AI' : isAm ? 'የAI ስህተት ሪፖርት' : 'Report AI Inaccuracy'}
        </span>
      </button>

      {/* Feedback Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto relative text-slate-100">
            {/* Gold Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-amber-400 font-serif-legal tracking-tight">
                    {isOm ? 'Gabaasa Dogoggora AI Seeraa' : isAm ? 'የሕግ AI ስህተት ሪፖርት' : 'Report AI Legal Inaccuracy'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isOm ? 'Deebii AI irratti hanqina ykn keeyyata sarqame sirreessuuf' : 'Help us refine AI accuracy and legal citations'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-6 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-300 text-xl font-bold">
                  ✓
                </div>
                <h4 className="text-sm font-bold">
                  {isOm ? 'Galatoomaa! Yaadni Keessan Galmeeffameera' : isAm ? 'እናመሰግናለን! ሪፖርትዎ ተመዝግቧል' : 'Feedback Submitted Successfully!'}
                </h4>
                <p className="text-xs text-slate-300">
                  {isOm 
                    ? 'Gabaasni keessan ogeeyyii seeraan qoratamee moodeela AI haaromsuuf ni fayyada.' 
                    : 'Your feedback will be reviewed by legal experts to refine AI accuracy.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">
                    {isOm ? 'Gosa Dogoggoraa / Inaccuracy Category:' : 'Inaccuracy Category:'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none"
                  >
                    <option value="ai_inaccuracy">
                      {isOm ? 'Xiinxala Seeraa Hin Sirriin / Inaccurate Analysis' : 'Inaccurate Legal Analysis'}
                    </option>
                    <option value="hallucinated_article">
                      {isOm ? 'Keeyyata Labsii Dogoggoraa / Hallucinated Article' : 'Hallucinated / Wrong Statutory Article'}
                    </option>
                    <option value="missing_law">
                      {isOm ? 'Murtii Ijibbaataa / Seera Dhabame (Missing Law)' : 'Missing Precedent or Law'}
                    </option>
                    <option value="translation_error">
                      {isOm ? 'Dogoggora Hiikkaa Seeraa / Translation Error' : 'Legal Translation Error'}
                    </option>
                    <option value="other">{isOm ? 'Wanta Biraa / Other' : 'Other'}</option>
                  </select>
                </div>

                {/* AI Content Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      {isOm ? 'Kutaa AI / Feature Area:' : 'Feature Area:'}
                    </label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none"
                    >
                      <option value="explain_law">Explain Law / Xiinxala</option>
                      <option value="cassation">Cassation Precedents</option>
                      <option value="document_draft">Document Drafting</option>
                      <option value="translate">Legal Translation</option>
                      <option value="general">General AI Search</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">
                      {isOm ? 'Imeelii / Contact Email:' : 'Contact Email:'}
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="ayeledha@gmail.com"
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Prompt Query */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">
                    {isOm ? 'Gaaffii ykn Mataduree (Search Query/Topic):' : 'Topic or Search Query (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={aiPromptQuery}
                    onChange={(e) => setAiPromptQuery(e.target.value)}
                    placeholder="e.g., Labsii Lakk. 242/2014 or Article 1727 Civil Code"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none font-mono"
                  />
                </div>

                {/* Detailed Inaccuracy Description (Required) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-amber-300 block">
                    {isOm ? 'Ibsa Dogoggoraa / Reported Inaccuracy (Required): *' : 'Description of Inaccuracy (Required): *'}
                  </label>
                  <textarea
                    rows={4}
                    value={reportedInaccuracy}
                    onChange={(e) => setReportedInaccuracy(e.target.value)}
                    placeholder={
                      isOm 
                        ? 'Deebii AI keessatti wanta dogoggora ta\'e, keeyyata sarqame ykn murtii ijibbaataa bakka hin buune bal\'inaan ibsaa...' 
                        : 'Describe what was inaccurate, hallucinated, or incorrect in the AI response...'
                    }
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none leading-relaxed"
                    required
                  />
                </div>

                {/* Suggested Correction */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">
                    {isOm ? 'Sirreessaa Yaadame / Suggested Correction (Optional):' : 'Suggested Correction / Correct Citation:'}
                  </label>
                  <input
                    type="text"
                    value={suggestedCorrection}
                    onChange={(e) => setSuggestedCorrection(e.target.value)}
                    placeholder="e.g. Correct article is Art. 1805 or Cassation Vol 22 File 189201"
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-500 outline-none font-mono"
                  />
                </div>

                {/* Satisfaction Rating */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-300">
                    {isOm ? 'Sadarkaa Quubsumsaa AI:' : 'AI Satisfaction Rating:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isOm ? 'Ergi / Submit Feedback' : 'Submit Feedback'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AIFeedbackFloatingButton;
