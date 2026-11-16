import React, { useState } from "react";
import type {
  QualityAuditReport,
  AuditCategory,
  ExpertReview
} from "../../server/quality_audit/quality-audit.types.js";

interface Props {
  report: QualityAuditReport;
  currentUser: {
    uid: string;
    role: string;
  };
  onSaveReview: (review: ExpertReview) => Promise<void>;
}

const labels: Record<AuditCategory, string> = {
  architecture: "Caasaa pirojektii",
  backend: "Backend",
  firebase_security: "Nageenya Firebase",
  api_security: "Nageenya API",
  legal_engine: "Legal Research Engine",
  ocr: "OCR fi document extraction",
  citations: "Citations fi madda seeraa",
  telegram: "Telegram indexing",
  build: "Build",
  tests: "Automated tests",
  privacy: "Iccitii fi eegumsa odeeffannoo",
  documentation: "Documentation"
};

export default function QualityAuditDashboard({
  report,
  currentUser,
  onSaveReview
}: Props) {
  const [category, setCategory] = useState<AuditCategory>("legal_engine");
  const [score, setScore] = useState<number>(5);
  const [comments, setComments] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const canReview = [
    "admin",
    "chief_judge",
    "it_auditor",
    "legal_expert"
  ].includes(currentUser.role);

  async function handleSaveReview() {
    if (!canReview) {
      setError("Hayyamni madaallii kennuu siif hin kennamne.");
      return;
    }

    if (comments.trim().length < 5) {
      setError("Yaada madaallii gabaabaa fi ifa ta'e (har'aa 5+) galchi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const newReview: ExpertReview = {
        reviewerId: currentUser.uid,
        reviewerRole: currentUser.role,
        reviewedAt: new Date().toISOString(),
        category,
        score,
        evidenceIds: report.evidence
          .filter(item => item.category === category)
          .map(item => item.id),
        comments: comments.trim(),
        recommendations: [],
        approved: true
      };

      await onSaveReview(newReview);
      setComments("");
      setScore(5);
    } catch {
      setError("Madaalliin hin kuufamne. Irra deebi'i yaali.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6 max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen">
      <header className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">
          SEERAAI Quality Assurance Center
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
          <span>Version: <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{report.version}</span></span>
          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
          <span>Project: <span className="font-mono text-slate-700">{report.projectId}</span></span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ScoreCard title="Automatic Audit" score={report.automaticScore} />
        <ScoreCard title="Expert Assessment" score={report.expertScore} />
        <ScoreCard title="Combined Score" score={report.combinedScore} highlight />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">
                Madaallii Category Tokkoon Tokkoon
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {report.categories.map(item => (
                <div key={item.category} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">{labels[item.category] || item.category}</span>
                      <span className="text-xs text-slate-500">
                        Ragaa: {item.evidenceCount} · Hanqina: {item.findingsCount}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black ${item.score === null ? "text-slate-300" : "text-blue-600"}`}>
                        {item.score === null ? "Hin madaalamne" : `${item.score} / 10`}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    {item.score !== null && (
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          item.score >= 8
                            ? "bg-emerald-500"
                            : item.score >= 5
                            ? "bg-blue-600"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, item.score * 10)}%` }}
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 italic">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Hanqina Argame ({report.findings.length})</h2>
            </div>

            <div className="p-6">
              {report.findings.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    Hanqinni mirkanaa'e hin jiru.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.findings.map(finding => (
                    <article key={finding.id} className="rounded-xl bg-slate-50 p-5 border border-slate-100 transition-hover hover:border-blue-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 leading-tight">{finding.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                              finding.severity === "critical" ? "bg-rose-100 text-rose-700" :
                              finding.severity === "high" ? "bg-orange-100 text-orange-700" :
                              "bg-slate-200 text-slate-600"
                            }`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{finding.description}</p>
                          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50">
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter block mb-1">TARKANFII / RECOMMENDATION</span>
                            <p className="text-sm text-blue-800 font-medium">{finding.recommendation}</p>
                          </div>
                        </div>
                      </div>
                      {finding.affectedFiles.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {finding.affectedFiles.map(f => (
                            <span key={f} className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 border border-slate-200 rounded">{f}</span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Madaallii Ogeessaa</h2>
            </div>

            <div className="p-6">
              {!canReview ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-center">
                   <p className="text-sm text-rose-700 font-bold">
                    Access Denied
                  </p>
                  <p className="text-xs text-rose-600 mt-1">Hayyamni madaallii kennuu siif hin kennamne.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Category Filadhu</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      value={category}
                      onChange={e => setCategory(e.target.value as AuditCategory)}
                    >
                      {(Object.entries(labels) as [AuditCategory, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Qabxii (Score)</label>
                       <span className="text-lg font-black text-blue-600">{score} <span className="text-xs text-slate-300">/ 10</span></span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={score}
                      onChange={e => setScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Yaada & Xiinxala (Review)</label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      rows={6}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Ragaa irratti hundaa'uun yaada kee barreessi..."
                    />
                  </div>

                  {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 p-3 rounded-lg">{error}</p>}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveReview}
                    className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Kuusaa jira...
                      </span>
                    ) : "Madaallii Mirkaniessi"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {report.limitations.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-sm font-black text-amber-900 uppercase tracking-wider mb-3">Daangaa Qorannoo (Limitations)</h2>
              <div className="space-y-2">
                {report.limitations.map((item, index) => (
                  <div key={index} className="flex gap-3 text-xs text-amber-800 font-medium">
                    <span className="shrink-0">•</span>
                    <p className="leading-normal">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function ScoreCard({ title, score, highlight }: { title: string; score: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm transition-all ${highlight ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
      <p className={`text-xs font-black uppercase tracking-widest ${highlight ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black">{score === null ? "N/A" : score}</span>
        {score !== null && <span className={`text-sm font-bold ${highlight ? "text-slate-500" : "text-slate-300"}`}>/ 10</span>}
      </div>
      {score !== null && (
        <div className="mt-4 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${score >= 8 ? "bg-emerald-400" : score >= 5 ? "bg-blue-400" : "bg-rose-400"}`}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      )}
    </div>
  );
}
