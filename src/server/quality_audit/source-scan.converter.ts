import {
  AuditEvidence,
  AuditFinding,
  AuditCategory
} from "./quality-audit.types.js";

export interface SourceScanResult {
  filePath: string;
  checkId: string;
  category: AuditCategory;
  passed: boolean | null;
  title: string;
  details: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  recommendation: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface SourceAuditBundle {
  revision: string;
  scannedFiles: string[];
  scanResults: SourceScanResult[];
  build: {
    executed: boolean;
    passed: boolean | null;
    logReference?: string;
  };
  tests: {
    executed: boolean;
    passed: boolean | null;
    total?: number;
    failed?: number;
    logReference?: string;
  };
}

export function convertSourceScan(
  bundle: SourceAuditBundle,
  actorId: string
): {
  evidence: AuditEvidence[];
  findings: AuditFinding[];
} {
  const evidence: AuditEvidence[] = [];
  const findings: AuditFinding[] = [];

  for (const result of bundle.scanResults) {
    const evidenceId = crypto.randomUUID();

    evidence.push({
      id: evidenceId,
      category: result.category,
      title: result.title,
      description: result.details,
      status:
        result.passed === true
          ? "verified"
          : result.passed === false
            ? "failed"
            : "inconclusive",
      sourceFile: result.filePath,
      lineStart: result.lineStart,
      lineEnd: result.lineEnd,
      verifiedAt: new Date().toISOString(),
      verifiedBy: actorId
    });

    if (result.passed === false) {
      findings.push({
        id: crypto.randomUUID(),
        category: result.category,
        severity: result.severity,
        title: result.title,
        description: result.details,
        affectedFiles: [result.filePath],
        recommendation: result.recommendation,
        evidenceIds: [evidenceId],
        verified: true
      });
    }
  }

  evidence.push({
    id: crypto.randomUUID(),
    category: "build",
    title: "Build verification",
    description: bundle.build.logReference ?? "Build log hin dhihaanne.",
    status: !bundle.build.executed
      ? "not_tested"
      : bundle.build.passed === true
        ? "verified"
        : bundle.build.passed === false
          ? "failed"
          : "inconclusive",
    verifiedAt: new Date().toISOString(),
    verifiedBy: actorId
  });

  evidence.push({
    id: crypto.randomUUID(),
    category: "tests",
    title: "Automated test verification",
    description: bundle.tests.logReference ?? "Test log hin dhihaanne.",
    status: !bundle.tests.executed
      ? "not_tested"
      : bundle.tests.passed === true
        ? "verified"
        : bundle.tests.passed === false
          ? "failed"
          : "inconclusive",
    verifiedAt: new Date().toISOString(),
    verifiedBy: actorId
  });

  return { evidence, findings };
}
