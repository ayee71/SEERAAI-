/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../i18n/translations';
import { BookmarkItem } from '../context/BookmarkContext';
import {
  getLocalSavedCitations,
  fetchSavedCitationsFromLibrary,
  SavedCitationItem,
} from './citationLibraryService';
import {
  getSavedDocuments,
  getSavedSearchBookmarks,
  getUserSettings,
  SavedLegalDocument,
  SavedSearchBookmark,
} from './storage';
import { sanitizeContentForExport } from './legalDocumentExport';
import { CASSATION_PRECEDENTS_DATA, CassationPrecedent } from '../data/cassationPrecedents';
import { MASTER_FILES, MasterLegalFile } from '../data/telegramMasterArchive';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';

export interface BookmarksExportSummary {
  precedentsCount: number;
  statutoryArticlesCount: number;
  documentsCount: number;
  searchBookmarksCount: number;
  totalCount: number;
}

export interface BookmarksExportOptions {
  lang?: Language;
  caseReference?: string;
  advocateName?: string;
  contextBookmarks?: BookmarkItem[];
  overrideCitations?: SavedCitationItem[];
  overrideDocuments?: SavedLegalDocument[];
  overrideSearchBookmarks?: SavedSearchBookmark[];
  includeDocuments?: boolean;
  includeSearchBookmarks?: boolean;
}

interface NormalizedPrecedentRow {
  ref: string;
  titleAndParties: string;
  courtAndYear: string;
  bindingPrinciple: string;
  statutesAndNotes: string;
}

interface NormalizedStatuteRow {
  proclamationAndArticle: string;
  lawAndJurisdiction: string;
  ruleAndCitation: string;
  caseAndNotes: string;
}

function readLocalBookmarkItems(): BookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('seera_ai_user_bookmarks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function stripMarkdownForPdf(input: string, maxLen: number = 900): string {
  if (!input) return '';
  const cleaned = input
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen).trim()}...`;
}

/**
 * Ensures text passed into jsPDF built-in Helvetica font does not produce garbled Ethiopic glyph boxes.
 * When Ethiopic-only text has a Latin/Oromo/English counterpart, callers can pass it as fallback.
 */
function toPdfSafeText(primary?: string, fallback?: string): string {
  const val = (primary || '').trim();
  const hasEthiopic = /[\u1200-\u137F]/.test(val);
  if (hasEthiopic && fallback && fallback.trim() && !/[\u1200-\u137F]/.test(fallback)) {
    return fallback.trim();
  }
  if (!val && fallback) return fallback.trim();
  if (hasEthiopic) {
    // Strip isolated Ethiopic glyphs only if no Latin text exists alongside them, keeping numbers/citations intact
    const latinOnly = val.replace(/[\u1200-\u137F]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return latinOnly || fallback || 'Saved Legal Entry (See App View for Ethiopic Script)';
  }
  return val;
}

function matchPrecedentByBookmark(bm: BookmarkItem): CassationPrecedent | null {
  const bmId = bm.id.toLowerCase();
  const bmTitle = bm.title.toLowerCase();
  return (
    CASSATION_PRECEDENTS_DATA.find(
      (p) =>
        p.id.toLowerCase() === bmId ||
        (p.fileNumber && (bmId.includes(p.fileNumber.toLowerCase()) || bmTitle.includes(p.fileNumber.toLowerCase())))
    ) || null
  );
}

function matchMasterFileByBookmark(bm: BookmarkItem): MasterLegalFile | null {
  const bmId = bm.id.toLowerCase();
  const bmTitle = bm.title.toLowerCase();
  return (
    MASTER_FILES.find(
      (f) =>
        f.id.toLowerCase() === bmId ||
        (f.fileNumber && (bmId.includes(f.fileNumber.toLowerCase()) || bmTitle.includes(f.fileNumber.toLowerCase())))
    ) || null
  );
}

function collectExportData(options: BookmarksExportOptions = {}, citationsSource?: SavedCitationItem[]) {
  const lang: Language = options.lang || 'om';
  const rawBookmarks = options.contextBookmarks ?? readLocalBookmarkItems();
  const citations = options.overrideCitations ?? citationsSource ?? getLocalSavedCitations();
  const allDocs = options.overrideDocuments ?? getSavedDocuments();
  const bookmarkedDocs = allDocs.filter((d) => d.isBookmarked);
  const searchBookmarks = options.overrideSearchBookmarks ?? getSavedSearchBookmarks();

  const precedentRows: NormalizedPrecedentRow[] = [];
  const statuteRows: NormalizedStatuteRow[] = [];
  const seenPrecedentKeys = new Set<string>();
  const seenStatuteKeys = new Set<string>();

  // 1. Process BookmarkContext items (Telegram Master Archive & Precedent bookmarks)
  for (const bm of rawBookmarks) {
    const matchedPrecedent = matchPrecedentByBookmark(bm);
    const matchedMaster = matchMasterFileByBookmark(bm);

    const isStatuteType =
      bm.type.toLowerCase().includes('statute') ||
      bm.type.toLowerCase().includes('proclamation') ||
      bm.type.toLowerCase().includes('article') ||
      bm.type.toLowerCase().includes('legislation');

    if (matchedPrecedent) {
      const key = `prec_${matchedPrecedent.fileNumber}`;
      if (seenPrecedentKeys.has(key)) continue;
      seenPrecedentKeys.add(key);

      const courtLabel =
        matchedPrecedent.courtName?.[lang === 'am' ? 'en' : lang] ||
        matchedPrecedent.courtName?.en ||
        (matchedPrecedent.courtJurisdiction === 'oromia'
          ? 'Oromia Supreme Court Cassation'
          : 'Federal Supreme Court Cassation');

      precedentRows.push({
        ref: `File No. ${matchedPrecedent.fileNumber}\nVol. ${matchedPrecedent.volume || 'N/A'}`,
        titleAndParties: `${toPdfSafeText(matchedPrecedent.parties[lang], matchedPrecedent.parties.en || bm.title)}\n\nIssue: ${toPdfSafeText(matchedPrecedent.legalIssue[lang], matchedPrecedent.legalIssue.en)}`,
        courtAndYear: `${toPdfSafeText(courtLabel)}\n${matchedPrecedent.yearEC} E.C. (${matchedPrecedent.yearGC} G.C.)`,
        bindingPrinciple: toPdfSafeText(matchedPrecedent.bindingPrinciple[lang], matchedPrecedent.bindingPrinciple.en),
        statutesAndNotes: [
          matchedPrecedent.statutoryProvisions?.length
            ? `Statutes: ${matchedPrecedent.statutoryProvisions.join(', ')}`
            : '',
          bm.note ? `Note: ${toPdfSafeText(bm.note)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } else if (matchedMaster) {
      const key = `master_${matchedMaster.fileNumber || matchedMaster.id}`;
      if (seenPrecedentKeys.has(key)) continue;
      seenPrecedentKeys.add(key);

      const title = toPdfSafeText(matchedMaster.title[lang === 'om' ? 'om' : 'en'], matchedMaster.title.en);
      const summary = toPdfSafeText(matchedMaster.summary[lang === 'om' ? 'om' : 'en'], matchedMaster.summary.en);
      const principle = toPdfSafeText(matchedMaster.principle[lang === 'om' ? 'om' : 'en'], matchedMaster.principle.en);
      const articles = matchedMaster.keyArticles
        ? toPdfSafeText(matchedMaster.keyArticles[lang === 'om' ? 'om' : 'en'], matchedMaster.keyArticles.en)
        : '';

      precedentRows.push({
        ref: `File No. ${matchedMaster.fileNumber}\nVol. ${matchedMaster.volume || 'Archive'}\nPost #${matchedMaster.postNumber}`,
        titleAndParties: `${title}\n\nSummary: ${summary}`,
        courtAndYear: `Telegram Master Archive\nCategory: ${matchedMaster.category.toUpperCase()}`,
        bindingPrinciple: principle,
        statutesAndNotes: [
          articles ? `Statutes: ${articles}` : '',
          `Source: https://t.me/seeraai_ethio/${matchedMaster.postNumber || 125}`,
          bm.note ? `Note: ${toPdfSafeText(bm.note)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } else if (isStatuteType) {
      const key = `bm_stat_${bm.id}`;
      if (seenStatuteKeys.has(key)) continue;
      seenStatuteKeys.add(key);

      statuteRows.push({
        proclamationAndArticle: bm.type.toUpperCase(),
        lawAndJurisdiction: toPdfSafeText(bm.title),
        ruleAndCitation: bm.note ? toPdfSafeText(bm.note) : toPdfSafeText(bm.title),
        caseAndNotes: bm.timestamp ? `Bookmarked: ${new Date(bm.timestamp).toLocaleDateString('en-US')}` : 'Saved Bookmark',
      });
    } else {
      const key = `bm_prec_${bm.id}`;
      if (seenPrecedentKeys.has(key)) continue;
      seenPrecedentKeys.add(key);

      precedentRows.push({
        ref: `Ref: ${bm.id.slice(0, 18)}`,
        titleAndParties: toPdfSafeText(bm.title),
        courtAndYear: `${bm.type.toUpperCase()}\n${bm.timestamp ? new Date(bm.timestamp).toLocaleDateString('en-US') : 'Saved'}`,
        bindingPrinciple: bm.note ? toPdfSafeText(bm.note) : toPdfSafeText(bm.title),
        statutesAndNotes: 'Source: Bookmarked Legal Precedent / Telegram Archive',
      });
    }
  }

  // 2. Process SavedCitationItem entries (Statutory Articles & Precedent Citations)
  for (const item of citations) {
    if (item.cassationRef && !item.articleNumber) {
      const key = `cit_prec_${item.id}`;
      if (!seenPrecedentKeys.has(key)) {
        seenPrecedentKeys.add(key);
        precedentRows.push({
          ref: item.cassationRef,
          titleAndParties: toPdfSafeText(item.title),
          courtAndYear: `${item.jurisdiction.toUpperCase()}\n${item.proclamationNumber || 'Cassation'}`,
          bindingPrinciple: toPdfSafeText(item.summary || item.insertText),
          statutesAndNotes: [
            item.caseName ? `Case: ${toPdfSafeText(item.caseName)}` : '',
            item.notes ? `Notes: ${toPdfSafeText(item.notes)}` : '',
          ]
            .filter(Boolean)
            .join('\n') || 'Saved Citation',
        });
      }
      continue;
    }

    const statKey = `cit_stat_${item.id}`;
    if (seenStatuteKeys.has(statKey)) continue;
    seenStatuteKeys.add(statKey);

    statuteRows.push({
      proclamationAndArticle: [
        item.proclamationNumber || 'Statute',
        item.articleNumber || '',
      ]
        .filter(Boolean)
        .join('\n'),
      lawAndJurisdiction: `${toPdfSafeText(item.lawTitle || item.title)}\n(${item.jurisdiction.toUpperCase()} • ${item.category})`,
      ruleAndCitation: toPdfSafeText(
        [item.title, item.summary, item.insertText ? `Citation: ${item.insertText}` : '']
          .filter(Boolean)
          .join('\n')
      ),
      caseAndNotes: [
        item.cassationRef ? `Cassation Ref: ${item.cassationRef}` : '',
        item.caseName ? `Case: ${toPdfSafeText(item.caseName)}` : '',
        item.notes ? `Notes: ${toPdfSafeText(item.notes)}` : '',
      ]
        .filter(Boolean)
        .join('\n') || `Saved: ${new Date(item.savedAt).toLocaleDateString('en-US')}`,
    });
  }

  // 3. Process Bookmarked SavedLegalDocument entries (from MyContentView)
  const docRows = (options.includeDocuments !== false ? bookmarkedDocs : []).map((d) => {
    const cleanText = stripMarkdownForPdf(sanitizeContentForExport(d.content), 750);
    return {
      titleAndType: `${toPdfSafeText(d.title)}\n[${d.docType || d.taskType.toUpperCase()}]`,
      caseAndStage: [
        d.caseName ? `Case: ${toPdfSafeText(d.caseName)}` : '',
        d.litigationStage ? `Stage: ${d.litigationStage.toUpperCase()}` : '',
        d.hearingDate ? `Hearing: ${d.hearingDate.slice(0, 10)}` : '',
      ]
        .filter(Boolean)
        .join('\n') || new Date(d.createdAt).toLocaleDateString('en-US'),
      excerpt: toPdfSafeText(cleanText),
    };
  });

  const filteredSearchBookmarks = options.includeSearchBookmarks !== false ? searchBookmarks : [];

  return {
    precedentRows,
    statuteRows,
    docRows,
    searchBookmarks: filteredSearchBookmarks,
    summary: {
      precedentsCount: precedentRows.length,
      statutoryArticlesCount: statuteRows.length,
      documentsCount: docRows.length,
      searchBookmarksCount: filteredSearchBookmarks.length,
      totalCount:
        precedentRows.length +
        statuteRows.length +
        docRows.length +
        filteredSearchBookmarks.length,
    } as BookmarksExportSummary,
  };
}

/**
 * Computes current live counts of all saved bookmarks across stores.
 */
export function getBookmarksExportSummary(contextBookmarks?: BookmarkItem[]): BookmarksExportSummary {
  return collectExportData({ contextBookmarks }).summary;
}

/**
 * Generates and downloads a structured Offline Courtroom PDF containing all bookmarked
 * legal precedents, statutory articles, saved research notes, and search bookmarks.
 */
export async function downloadBookmarksAsCourtroomPDF(
  options: BookmarksExportOptions = {}
): Promise<BookmarksExportSummary> {
  const lang: Language = options.lang || 'om';
  const settings = getUserSettings();

  // Attempt remote-merged fetch with automatic local fallback so it always works offline
  let citations: SavedCitationItem[] = options.overrideCitations ?? getLocalSavedCitations();
  if (!options.overrideCitations) {
    try {
      citations = await fetchSavedCitationsFromLibrary();
    } catch {
      citations = getLocalSavedCitations();
    }
  }

  const { precedentRows, statuteRows, docRows, searchBookmarks, summary } = collectExportData(
    options,
    citations
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isOm = lang === 'om';
  const now = new Date();
  const gregorianDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const ethDate = toPdfSafeText(formatEthiopianDate(now, isOm ? 'om' : 'en'), formatEthiopianDate(now, 'en'));

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 40, 210, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(
    isOm
      ? 'SEERAAI PRO • GALMEE WABIILEE FI MURTIIWWAN KUUFAMAN (OFFLINE)'
      : 'SEERAAI PRO • OFFLINE COURTROOM BOOKMARKS DOSSIER',
    14,
    15
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(
    'Saved Legal Precedents, Cassation Decisions & Statutory Articles for Offline Courtroom Reference',
    14,
    22
  );

  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`Date: ${gregorianDate} (${ethDate})`, 14, 29);

  const advocate =
    options.advocateName ||
    settings.lawFirmBranding?.advocateName ||
    settings.visitorName ||
    'Legal Professional';
  const firm =
    settings.lawFirmBranding?.firmNameOm ||
    settings.lawFirmBranding?.firmNameEn ||
    'SEERAAI PRO Legal Intelligence';
  doc.setTextColor(203, 213, 225);
  doc.text(`Counsel: ${toPdfSafeText(advocate)} | Practice: ${toPdfSafeText(firm)}`, 14, 35);

  let currentY = 49;

  if (options.caseReference) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Case Reference: ${toPdfSafeText(options.caseReference)}`, 14, currentY);
    currentY += 6;
  }

  // Executive Summary Table
  autoTable(doc, {
    startY: currentY,
    head: [[
      isOm ? 'Murtiiwwan Ijibbaataa (Precedents)' : 'Bookmarked Precedents',
      isOm ? 'Keewwattoota Seeraa (Articles)' : 'Statutory Articles',
      isOm ? 'Sanadoota Kuufaman (Briefs)' : 'Bookmarked Documents',
      isOm ? 'Barbaacha Kuufaman (Searches)' : 'Saved Searches',
      isOm ? 'Waliigala (Total)' : 'Total Items',
    ]],
    body: [[
      String(summary.precedentsCount),
      String(summary.statutoryArticlesCount),
      String(summary.documentsCount),
      String(summary.searchBookmarksCount),
      String(summary.totalCount),
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [251, 191, 36],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      fontStyle: 'bold',
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 3,
    },
    margin: { left: 14, right: 14 },
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY + 18) + 8;

  if (summary.totalCount === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      isOm
        ? 'Wabiileen ykn keewwattoonni seeraa kuufaman ammaaf hin jiran. Barbaacha seeraa keessatti "Bookmark" tuquun kuusaa keessan guutaa.'
        : 'No bookmarked precedents or statutory articles were found yet. Bookmark rulings or statutory provisions inside SeeraAI to populate your offline courtroom dossier.',
      14,
      currentY,
      { maxWidth: 182 }
    );
  }

  // SECTION I: Bookmarked Legal Precedents & Cassation Decisions
  if (precedentRows.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isOm
        ? `I. MURTIIWWAN DHADDACHA IJIBBAATAA & WABIILEE KUUFAMAN (${precedentRows.length})`
        : `I. BOOKMARKED LEGAL PRECEDENTS & CASSATION RULINGS (${precedentRows.length})`,
      14,
      currentY
    );
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [[
        '#',
        'File No. / Vol.',
        'Parties & Legal Issue',
        'Binding Principle (Ratio Decidendi)',
        'Statutes & Counsel Notes',
      ]],
      body: precedentRows.map((row, idx) => [
        String(idx + 1),
        `${row.ref}\n\n${row.courtAndYear}`,
        row.titleAndParties,
        row.bindingPrinciple,
        row.statutesAndNotes,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [245, 158, 11],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [30, 41, 59],
        cellPadding: 2.8,
        valign: 'top',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 46 },
        3: { cellWidth: 62 },
        4: { cellWidth: 34 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 20 },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
  }

  // SECTION II: Saved Statutory Articles & Proclamations
  if (statuteRows.length > 0) {
    if (currentY > 245) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isOm
        ? `II. KEEWWATTOOTA SEERAA FI LABSIIWWAN KUUFAMAN (${statuteRows.length})`
        : `II. SAVED STATUTORY ARTICLES & PROCLAMATIONS (${statuteRows.length})`,
      14,
      currentY
    );
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [[
        '#',
        'Proclamation & Article',
        'Code / Jurisdiction',
        'Statutory Provision & Court Citation Text',
        'Case Reference & Notes',
      ]],
      body: statuteRows.map((row, idx) => [
        String(idx + 1),
        row.proclamationAndArticle,
        row.lawAndJurisdiction,
        row.ruleAndCitation,
        row.caseAndNotes,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [15, 118, 110], // teal-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [30, 41, 59],
        cellPadding: 2.8,
        valign: 'top',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 40 },
        3: { cellWidth: 68 },
        4: { cellWidth: 34 },
      },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: 14, right: 14, bottom: 20 },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
  }

  // SECTION III: Bookmarked Legal Documents & Courtroom Notes
  if (docRows.length > 0) {
    if (currentY > 245) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isOm
        ? `III. SANADOOTA SEERAA KUUFAMAN (BOOKMARKED BRIEFS) (${docRows.length})`
        : `III. BOOKMARKED LEGAL BRIEFS & RESEARCH NOTES (${docRows.length})`,
      14,
      currentY
    );
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [[
        '#',
        'Document Title & Type',
        'Case & Litigation Stage',
        'Sanitized Legal Content Excerpt',
      ]],
      body: docRows.map((row, idx) => [
        String(idx + 1),
        row.titleAndType,
        row.caseAndStage,
        row.excerpt,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [251, 191, 36],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [30, 41, 59],
        cellPadding: 2.8,
        valign: 'top',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42 },
        2: { cellWidth: 36 },
        3: { cellWidth: 96 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 20 },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
  }

  // SECTION IV: Saved Search Bookmarks
  if (searchBookmarks.length > 0) {
    if (currentY > 245) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isOm
        ? `IV. BARBAACHA SEERAA KUUFAMAN (SAVED SEARCHES) (${searchBookmarks.length})`
        : `IV. SAVED CASSATION SEARCH QUERIES (${searchBookmarks.length})`,
      14,
      currentY
    );
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [[
        '#',
        'Bookmark Title',
        'Search Query / Keywords',
        'Filters (File No. / Court / Vol.)',
      ]],
      body: searchBookmarks.map((bm, idx) => [
        String(idx + 1),
        toPdfSafeText(bm.title),
        toPdfSafeText(bm.query || 'N/A'),
        [
          bm.fileNumber ? `File: ${bm.fileNumber}` : '',
          bm.court && bm.court !== 'all' ? `Court: ${bm.court}` : '',
          bm.category && bm.category !== 'all' ? `Category: ${bm.category}` : '',
          bm.volume && bm.volume !== 'all' ? `Vol: ${bm.volume}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || 'All Jurisdictions',
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [226, 232, 240],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [30, 41, 59],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 46 },
        2: { cellWidth: 74 },
        3: { cellWidth: 54 },
      },
      margin: { left: 14, right: 14, bottom: 20 },
    });
  }

  // Neutral courtroom footer & page numbering across all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(14, 282, 196, 282);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SEERAAI PRO • Offline Courtroom Legal Reference (Generated ${now.toISOString().slice(0, 10)})`,
      14,
      287
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  const fileDate = now.toISOString().slice(0, 10);
  doc.save(`SEERAAI_Courtroom_Bookmarks_${fileDate}.pdf`);

  return summary;
}
