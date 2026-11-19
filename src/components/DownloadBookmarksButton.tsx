import React, { useState, useEffect, useCallback } from 'react';
import { Download, Loader2, Check, Bookmark } from 'lucide-react';
import { Language } from '../i18n/translations';
import { useBookmarks } from '../context/BookmarkContext';
import {
  downloadBookmarksAsCourtroomPDF,
  getBookmarksExportSummary,
  BookmarksExportSummary,
  BookmarksExportOptions,
} from '../services/bookmarksPdfExport';

interface DownloadBookmarksButtonProps {
  currentLang: Language;
  variant?: 'primary' | 'secondary' | 'compact';
  className?: string;
  exportOptions?: Partial<BookmarksExportOptions>;
  onExportComplete?: (summary: BookmarksExportSummary) => void;
}

export const DownloadBookmarksButton: React.FC<DownloadBookmarksButtonProps> = ({
  currentLang,
  variant = 'primary',
  className = '',
  exportOptions,
  onExportComplete,
}) => {
  const { bookmarks } = useBookmarks();
  const [isExporting, setIsExporting] = useState(false);
  const [justExported, setJustExported] = useState(false);
  const [summary, setSummary] = useState<BookmarksExportSummary>(() =>
    getBookmarksExportSummary(bookmarks)
  );

  const refreshCounts = useCallback(() => {
    setSummary(getBookmarksExportSummary(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    refreshCounts();
    window.addEventListener('seera_storage_changed', refreshCounts);
    window.addEventListener('seera:saved_citations_updated', refreshCounts);
    return () => {
      window.removeEventListener('seera_storage_changed', refreshCounts);
      window.removeEventListener('seera:saved_citations_updated', refreshCounts);
    };
  }, [refreshCounts]);

  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const labelText = isOm
    ? 'Download Bookmarks (PDF)'
    : isAm
    ? 'ዕልባቶችን አውርድ (PDF)'
    : 'Download Bookmarks (PDF)';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExporting) return;

    setIsExporting(true);
    try {
      const result = await downloadBookmarksAsCourtroomPDF({
        lang: currentLang,
        contextBookmarks: bookmarks,
        ...exportOptions,
      });
      setSummary(result);
      setJustExported(true);
      onExportComplete?.(result);

      window.dispatchEvent(
        new CustomEvent('seera:show_toast', {
          detail: {
            emoji: '📑',
            message: isOm
              ? `Galmeen Wabiilee (${result.totalCount}) PDF dhaddachaa ta'ee buufameera!`
              : isAm
              ? `የተቀመጡ ዕልባቶች (${result.totalCount}) በPDF ወርደዋል!`
              : `Courtroom Bookmarks Dossier (${result.totalCount} items) downloaded as PDF!`,
          },
        })
      );

      setTimeout(() => setJustExported(false), 3000);
    } catch (err) {
      console.error('[DownloadBookmarksButton] Failed to export bookmarks PDF:', err);
      window.dispatchEvent(
        new CustomEvent('seera:show_toast', {
          detail: {
            emoji: '⚠️',
            message: isOm
              ? "PDF qopheessuun hin danda'amne. Irra deebi'ii yaali."
              : 'Could not generate Bookmarks PDF. Please retry.',
          },
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const baseStyles =
    variant === 'primary'
      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md border border-amber-400'
      : variant === 'secondary'
      ? 'bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold border border-amber-500/30';

  const countBadgeStyle =
    variant === 'primary'
      ? 'bg-slate-950 text-amber-300'
      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30';

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isExporting}
      title={
        isOm
          ? 'Murtiiwwan ijibbaataa fi keewwattoota seeraa kuufaman PDF dhaddachaa offline tti buufadhu'
          : isAm
          ? 'የተቀመጡ የሰበር ውሳኔዎችንና የሕግ አንቀጾችን ለችሎት አገልግሎት በPDF ያውርዱ'
          : 'Export saved legal precedents and statutory articles as a structured PDF for offline courtroom use'
      }
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-60 ${baseStyles} ${className}`}
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : justExported ? (
        <Check className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Download className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        {isExporting
          ? isOm
            ? 'Qopheessaa jira...'
            : isAm
            ? 'በማዘጋጀት ላይ...'
            : 'Preparing PDF...'
          : justExported
          ? isOm
            ? 'Buufameera ✓'
            : isAm
            ? 'ወርዷል ✓'
            : 'Downloaded ✓'
          : labelText}
      </span>
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono inline-flex items-center gap-1 ${countBadgeStyle}`}>
        <Bookmark className="w-2.5 h-2.5" />
        <span>{summary.totalCount}</span>
      </span>
    </button>
  );
};
