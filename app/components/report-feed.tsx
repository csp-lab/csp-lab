"use client";

import { useCallback, useEffect, useState } from "react";

type CspReport = {
  id: string;
  receivedAt: string;
  directive: string;
  blockedURI: string;
  documentURI: string;
  sourceFile?: string;
  lineNumber?: number;
  sample?: string;
  disposition?: string;
  via: "report-to" | "report-uri";
};

type FeedData = {
  reports: CspReport[];
  total: number;
  startedAt: string;
};

function shortPath(uri: string) {
  if (!uri) return "unknown document";
  try {
    const url = new URL(uri);
    return `${url.pathname}${url.search}`;
  } catch {
    return uri;
  }
}

export default function ReportFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/csp-report", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as FeedData;
      setData(next);
    } catch {
      // The next poll will try again.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled || document.visibilityState === "hidden") return;
      await load();
    }

    void poll();
    const interval = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [load]);

  async function clear() {
    setClearing(true);
    try {
      await fetch("/api/csp-report", { method: "DELETE" });
      setData({
        reports: [],
        total: 0,
        startedAt: new Date().toISOString(),
      });
    } finally {
      setClearing(false);
    }
  }

  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="feed">
      <div className="feed-head">
        <div>
          <h2>Live reports</h2>
          <p>
            Auto-refreshing ·{" "}
            <strong>{total}</strong> received since server start
          </p>
        </div>
        <button
          type="button"
          className="clear-button"
          onClick={clear}
          disabled={clearing || total === 0}
        >
          {clearing ? "Clearing" : "Clear"}
        </button>
      </div>

      <div className="feed-list" aria-live="polite">
        {reports.length === 0 ? (
          <div className="feed-empty">
            <p>No reports yet.</p>
            <p>
              Reload the page or run a test. Refusals land here automatically.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const observed =
              report.disposition === "report" ||
              report.disposition === "reporting";
            return (
              <article
                className={`report-item${observed ? " is-observe" : ""}`}
                key={report.id}
              >
                <div className="report-top">
                  <span className="report-directive">{report.directive}</span>
                  <time dateTime={report.receivedAt}>
                    {new Date(report.receivedAt).toLocaleTimeString([], {
                      hour12: false,
                    })}
                  </time>
                </div>
                <code className="report-blocked">
                  {report.blockedURI || "inline"}
                </code>
                <p className="report-doc">{shortPath(report.documentURI)}</p>
                {report.sample ? (
                  <code className="report-sample">
                    {report.sample.slice(0, 90)}
                  </code>
                ) : null}
                <div className="report-meta">
                  <span className={`via-chip via-${report.via}`}>
                    {report.via}
                  </span>
                  {report.disposition ? (
                    <span>{report.disposition}</span>
                  ) : null}
                  {typeof report.lineNumber === "number" ? (
                    <span>line {report.lineNumber}</span>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {total > reports.length ? (
        <p className="feed-footnote">
          Showing the latest {reports.length} of {total} reports.
        </p>
      ) : (
        <p className="feed-footnote">
          Stored in process memory. Both wire formats are accepted.
        </p>
      )}
    </div>
  );
}
