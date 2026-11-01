import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getDirectives } from "@/lib/csp";
import TestBench from "./test-bench";
import ReportFeed from "./report-feed";

type Mode = "enforce" | "report-only";

/**
 * CSP is fixed to the document. A client navigation keeps the policy from
 * the page that was actually loaded, so crossing into or out of report-only
 * has to be a full load or img-src and the rest stay on the old disposition.
 */
function PolicyLink({
  href,
  className,
  children,
  reload,
}: {
  href: string;
  className: string;
  children: ReactNode;
  reload: boolean;
}) {
  if (reload) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

const IMAGE_URL = "https://picsum.photos/seed/csp-lab/720/420";
const FRAME_URL = "https://example.org";

export default async function Demo({ mode }: { mode: Mode }) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? "";
  const dev = process.env.NODE_ENV !== "production";
  const directives = getDirectives(nonce, dev);
  const reportOnly = mode === "report-only";
  const headerName = reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  const statusWord = reportOnly ? "Reported" : "Blocked";

  return (
    <>
      {/*
        Deliberately missing the nonce. In enforce mode the browser refuses to
        run it; in report-only mode it runs and a report is still sent.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: "window.__staticInlineScriptRan = true;",
        }}
      />
      <script src="https://code.jquery.com/jquery-3.7.1.min.js" async />

      <header className="topbar">
        <PolicyLink href="/" className="wordmark" reload={reportOnly}>
          <span className="wordmark-mark" aria-hidden="true" />
          CSP Lab
        </PolicyLink>
        <div className="topbar-right">
          <span className="endpoint-chip">
            <span className="live-dot" aria-hidden="true" />
            report endpoint <code>/api/csp-report</code>
          </span>
          <PolicyLink className="switch-link" href="/docs" reload={reportOnly}>
            Docs
          </PolicyLink>
          <PolicyLink
            className="switch-link"
            href={reportOnly ? "/enforced" : "/report-only"}
            reload
          >
            {reportOnly ? "See the enforced page" : "See the report-only twin"}
          </PolicyLink>
        </div>
      </header>

      <main className={`page mode-${mode}`}>
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">
              {reportOnly
                ? "Same policy, nothing blocked"
                : "Content Security Policy, running live"}
            </p>
            <h1>
              {reportOnly ? (
                <>
                  Nothing is blocked.
                  <br />
                  Everything is reported.
                </>
              ) : (
                <>
                  Nothing loads unless
                  <br />
                  the policy says so.
                </>
              )}
            </h1>
            <p className="hero-lede">
              {reportOnly
                ? "This page sends the same policy as Content-Security-Policy-Report-Only. The markup below still attempts forbidden things; the browser allows them and files a violation report with this app's own endpoint"
                : "This page sends a strict CSP with every response. The markup below deliberately attempts things the policy forbids, and the browser reports each refusal back to this app's own endpoint"}{" "}
              using <code>report-uri</code>.
            </p>
            <div className="hero-meta">
              <span className={`mode-badge ${reportOnly ? "is-observe" : ""}`}>
                {reportOnly ? "Report-Only" : "Enforced"}
              </span>
              <span>
                Fresh nonce per response · {directives.length} directives ·
                report-uri delivery
              </span>
            </div>
          </div>

          <div className="policy-panel">
            <div className="policy-panel-head">
              <span className="panel-label">Response header</span>
              <code className="header-name">{headerName}</code>
            </div>
            <pre className="policy-code" aria-label="Content Security Policy">
              {directives.map((directive, index) => (
                <span
                  className={`policy-line${directive.reports ? " reports" : ""}`}
                  key={directive.name}
                >
                  <span className="policy-key">{directive.name}</span>{" "}
                  <span className="policy-value">{directive.value}</span>
                  {index < directives.length - 1 ? ";" : ""}
                  {"\n"}
                </span>
              ))}
            </pre>
            <div className="policy-chain">
              <span className="chain-step">report-uri</span>
              <span className="chain-arrow" aria-hidden="true">
                →
              </span>
              <code>/api/csp-report</code>
              <span className="chain-note">works on HTTP and HTTPS</span>
            </div>
          </div>
        </section>

        <section className="load-test">
          <div className="section-head">
            <h2>This page tried to break its own policy</h2>
            <p>
              Four elements are in the markup right now.{" "}
              {reportOnly
                ? "The browser loaded them anyway and sent a violation report for each one."
                : "The browser stopped them before they loaded; the reports arrived without any JavaScript on our side."}
            </p>
          </div>

          <div className="breach-grid">
            <figure className="breach">
              <div className="breach-frame image-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMAGE_URL}
                  alt="A remote landscape from picsum.photos"
                  width={720}
                  height={420}
                />
                <span className="breach-tag">img-src</span>
                {!reportOnly && (
                  <span className="breach-overlay">
                    Remote image refused
                  </span>
                )}
              </div>
              <figcaption>
                <span className="breach-status">{statusWord}</span>
                <span>
                  <code>picsum.photos</code> is not in <code>img-src</code>.
                </span>
              </figcaption>
            </figure>

            <figure className="breach">
              <div className="breach-frame frame-frame">
                <iframe src={FRAME_URL} title="Third-party iframe test" />
                <span className="breach-tag">frame-src</span>
                {reportOnly ? null : (
                  <span className="breach-overlay">
                    Third-party frame refused
                  </span>
                )}
              </div>
              <figcaption>
                <span className="breach-status">{statusWord}</span>
                <span>
                  <code>example.org</code> is not in <code>frame-src</code>.
                </span>
              </figcaption>
            </figure>

            <figure className="breach">
              <div className="breach-frame script-frame">
                <pre>
                  <code>{`<script>
  window.__staticInlineScriptRan = true;
</script>`}</code>
                </pre>
                <span className="breach-tag">script-src</span>
                {!reportOnly && (
                  <span className="breach-overlay">
                    Inline script refused
                  </span>
                )}
              </div>
              <figcaption>
                <span className="breach-status">{statusWord}</span>
                <span>
                  No <code>nonce</code>, no <code>unsafe-inline</code>, no
                  execution.
                </span>
              </figcaption>
            </figure>

            <figure className="breach">
              <div className="breach-frame script-frame">
                <pre>
                  <code>{`<script
  src="https://code.jquery.com/jquery-3.7.1.min.js">
</script>`}</code>
                </pre>
                <span className="breach-tag">script-src</span>
                {!reportOnly && (
                  <span className="breach-overlay">
                    Third-party script refused
                  </span>
                )}
              </div>
              <figcaption>
                <span className="breach-status">{statusWord}</span>
                <span>
                  <code>strict-dynamic</code> trusts nonce-created scripts, not
                  parser-inserted ones.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="lab">
          <div className="lab-main">
            <div className="section-head">
              <h2>Trigger a violation</h2>
              <p>
                Each button asks the browser to do something the policy
                disallows. Watch the feed on the right while the request fails.
              </p>
            </div>
            <TestBench nonce={nonce} mode={mode} />
          </div>

          <aside className="lab-feed">
            <ReportFeed />
          </aside>
        </section>

        <footer className="footer">
          <div className="footer-copy">
            <h2>How a refusal gets home</h2>
            <p>
              The policy&apos;s <code>report-uri</code> directive points at{" "}
              <code>/api/csp-report</code>, so the browser POSTs a JSON
              violation body there after every refusal. It is the legacy
              reporting channel, but every major browser still supports it and
              it works over both HTTP and HTTPS. The endpoint also accepts the
              newer Reporting API wire format for manual testing.
            </p>
            <p className="fineprint">
              Reports are held in process memory: they survive page reloads but
              not a server restart. No secure context or extra reporting headers
              are required.
            </p>
          </div>
          <div className="footer-facts">
            <div>
              <span>Policy</span>
              <strong>{reportOnly ? "Observe only" : "Enforce"}</strong>
            </div>
            <div>
              <span>Reporting</span>
              <strong>report-uri</strong>
            </div>
            <div>
              <span>Transport</span>
              <strong>HTTP + HTTPS</strong>
            </div>
            <div>
              <span>Storage</span>
              <strong>in memory</strong>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
