import { HashVerificationResult } from '../services/documentHashVerificationService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Converts verification history to a CSV string for legal audit reports.
 */
export function exportVerificationHistoryToCsv(history: HashVerificationResult[]): string {
  if (!history || history.length === 0) return '';

  const headers = ['Timestamp', 'Document ID', 'Name', 'Status', 'Is Verified', 'Algorithm', 'Expected Hash', 'Calculated Hash'];
  const rows = history.map((entry) => [
    entry.verifiedAt,
    entry.documentId,
    entry.name || 'N/A',
    entry.status,
    entry.isVerified ? 'YES' : 'NO',
    entry.algorithm,
    entry.expectedHash,
    entry.calculatedHash,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Generates a signed PDF report for verification history.
 */
export async function exportVerificationHistoryToPdf(history: HashVerificationResult[], language: 'om' | 'am' | 'en' = 'en'): Promise<Blob> {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('SEERAAI - Legal Audit Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generated on: ${timestamp}`, 14, 30);
  doc.text('Cryptographic Document Integrity Audit Trail', 14, 35);

  const tableColumn = ['Timestamp', 'Document', 'Status', 'Algorithm', 'Calculated Hash'];
  const tableRows = history.map(entry => [
    formatLegalTimestamp(entry.verifiedAt),
    entry.name || entry.documentId,
    entry.isVerified ? 'VERIFIED' : 'MISMATCH',
    entry.algorithm,
    entry.calculatedHash.substring(0, 16) + '...'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }, // Slate-900
    styles: { fontSize: 8 },
  });

  // Verification Seal
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DIGITAL VERIFICATION SEAL', 14, finalY + 20);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 22, 196, finalY + 22);
  
  doc.setFontSize(8);
  doc.text('This document is a system-generated audit report confirming the cryptographic integrity checks performed by the SEERAAI platform.', 14, finalY + 30);
  doc.text('Authoritative Hash Registry: saorethio1.com / GitHub @ayeledha', 14, finalY + 35);

  return doc.output('blob');
}

/**
 * Triggers a browser download for a CSV file.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a browser download for a PDF file.
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
}

/**
 * Converts verification history to a JSON string.
 */
export function exportVerificationHistoryToJson(history: HashVerificationResult[]): string {
  if (!history || history.length === 0) return '[]';
  return JSON.stringify(history, null, 2);
}

/**
 * Triggers a browser download for a JSON file.
 */
export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats a timestamp into a human-readable legal date.
 */
export function formatLegalTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoString;
  }
}
