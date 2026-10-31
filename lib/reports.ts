export type ReportVia = "report-to" | "report-uri";

export type CspReport = {
  id: string;
  receivedAt: string;
  directive: string;
  blockedURI: string;
  documentURI: string;
  sourceFile?: string;
  lineNumber?: number;
  sample?: string;
  disposition?: string;
  via: ReportVia;
};

type ReportStore = {
  reports: CspReport[];
  total: number;
  startedAt: string;
};

const MAX_REPORTS = 250;

// A module-level store survives between requests in `next dev` and `next start`,
// but resets on server restart and is not shared across serverless instances.
// That is fine for a demo; a real deployment would write to a queue or database.
const globalForReports = globalThis as unknown as {
  __cspReportStore?: ReportStore;
};

function getStore(): ReportStore {
  if (!globalForReports.__cspReportStore) {
    globalForReports.__cspReportStore = {
      reports: [],
      total: 0,
      startedAt: new Date().toISOString(),
    };
  }
  return globalForReports.__cspReportStore;
}

export function addReports(reports: CspReport[]) {
  const store = getStore();
  store.reports.unshift(...reports);
  store.total += reports.length;
  if (store.reports.length > MAX_REPORTS) {
    store.reports.length = MAX_REPORTS;
  }
}

export function getReports() {
  const store = getStore();
  return {
    reports: store.reports,
    total: store.total,
    startedAt: store.startedAt,
  };
}

export function clearReports() {
  const store = getStore();
  store.reports = [];
  store.total = 0;
  store.startedAt = new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function baseReport(): Pick<
  CspReport,
  "id" | "receivedAt" | "directive" | "blockedURI" | "documentURI"
> {
  return {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    directive: "unknown",
    blockedURI: "",
    documentURI: "",
  };
}

/**
 * Handles both wire formats:
 *
 * 1. Reporting API (`report-to`):
 *    [{ "type": "csp-violation", "body": { "effectiveDirective": ... } }]
 *
 * 2. Legacy CSP reports (`report-uri`):
 *    { "csp-report": { "effective-directive": ..., "blocked-uri": ... } }
 */
export function normalizePayload(payload: unknown): CspReport[] {
  const items = Array.isArray(payload) ? payload : [payload];
  const reports: CspReport[] = [];

  for (const item of items) {
    if (!isRecord(item)) continue;

    if (item.type === "csp-violation" && isRecord(item.body)) {
      const body = item.body;
      reports.push({
        ...baseReport(),
        directive:
          asString(body.effectiveDirective) ??
          asString(body.violatedDirective) ??
          "unknown",
        blockedURI: asString(body.blockedURL) ?? "",
        documentURI: asString(body.documentURL) ?? "",
        sourceFile: asString(body.sourceFile),
        lineNumber: asNumber(body.lineNumber),
        sample: asString(body.sample),
        disposition: asString(body.disposition),
        via: "report-to",
      });
      continue;
    }

    if (isRecord(item["csp-report"])) {
      const body = item["csp-report"];
      reports.push({
        ...baseReport(),
        directive:
          asString(body["effective-directive"]) ??
          asString(body["violated-directive"]) ??
          "unknown",
        blockedURI: asString(body["blocked-uri"]) ?? "",
        documentURI: asString(body["document-uri"]) ?? "",
        sourceFile: asString(body["source-file"]),
        lineNumber: asNumber(body["line-number"]),
        sample: asString(body["script-sample"]),
        disposition: asString(body.disposition),
        via: "report-uri",
      });
    }
  }

  return reports;
}
