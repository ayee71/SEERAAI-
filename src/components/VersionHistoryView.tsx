import React, { useState } from 'react';
import { History, RotateCcw, Clock, ShieldCheck, X } from 'lucide-react';
import { Language } from '../i18n/translations';
import { SavedLegalDocument, updateDocument } from '../services/storage';

interface VersionHistoryViewProps {
  doc: SavedLegalDocument;
  currentLang: Language;
  onRestored: (updatedDoc: SavedLegalDocument) => void;
}

export const VersionHistoryView: React.FC<VersionHistoryViewProps> = ({
  doc,
  currentLang,
  onRestored,
}) => {
  const versions = doc.versions || [];
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions.length > 0 ? versions[0].id : 'current'
  );
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentVersion = {
    id: 'current',
    timestamp: doc.createdAt || new Date().toISOString(),
    title: doc.title,
    content: doc.content,
    isCurrent: true,
  };

  const allVersionList = [
    currentVersion,
    ...versions.map((v) => ({ ...v, isCurrent: false })),
  ];

  const targetVersion = allVersionList.find((v) => v.id === selectedVersionId) || currentVersion;

  const handleRestoreVersion = (ver: typeof targetVersion) => {
    if (ver.isCurrent) return;
    if (confirm(currentLang === 'om' ? 'Version kana gara ammaatti deebisuu (Restore) barbaadduu?' : 'Do you want to restore this version?')) {
      const updated = updateDocument(doc.id, {
        title: ver.title,
        content: ver.content,
      });
      if (updated) {
        setSuccessToast(currentLang === 'om' ? 'Version milkaa\'inaan deebi\'eera!' : 'Version restored successfully!');
        setTimeout(() => {
          onRestored(updated);
          setSuccessToast(null);
        }, 1500);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden">
      {/* Toast */}
      {successToast && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 p-3 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{successToast}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Versions Sidebar */}
        <div className="w-full md:w-80 border-r border-slate-800 bg-slate-950/50 p-4 overflow-y-auto space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
            Tarree Revisions ({allVersionList.length})
          </h4>

          {allVersionList.map((ver, idx) => {
            const isSelected = selectedVersionId === ver.id;
            return (
              <div
                key={ver.id}
                onClick={() => setSelectedVersionId(ver.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-md'
                    : 'bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <span>{ver.isCurrent ? '⭐' : `v${allVersionList.length - idx}`}</span>
                    <span className="truncate max-w-[150px]">{ver.title}</span>
                  </span>
                  {ver.isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                      Current
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{new Date(ver.timestamp).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Viewer / Comparison View */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          <div className="flex justify-end mb-4">
             <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                compareMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {compareMode ? '⚡ Compare Active' : '⚖️ Compare'}
            </button>
          </div>
          {compareMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              {/* Current Version */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>⭐</span> Current Version
                  </span>
                </div>
                <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 whitespace-pre-wrap font-sans overflow-y-auto max-h-[350px]">
                  {doc.content}
                </div>
              </div>

              {/* Selected Older Version */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>📜</span> Revision ({targetVersion.title})
                  </span>
                </div>
                <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 whitespace-pre-wrap font-sans overflow-y-auto max-h-[350px]">
                  {targetVersion.content}
                </div>

                {!targetVersion.isCurrent && (
                  <button
                    onClick={() => handleRestoreVersion(targetVersion)}
                    className="mt-3 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div>
                  <h4 className="font-bold text-slate-100 text-base">
                    {targetVersion.title}
                  </h4>
                  <span className="text-xs text-amber-400 font-mono mt-0.5 block">
                    Saved on: {new Date(targetVersion.timestamp).toLocaleString()}
                  </span>
                </div>

                {!targetVersion.isCurrent && (
                  <button
                    onClick={() => handleRestoreVersion(targetVersion)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Version</span>
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-200 whitespace-pre-wrap font-sans overflow-y-auto max-h-[420px] leading-relaxed">
                {targetVersion.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
