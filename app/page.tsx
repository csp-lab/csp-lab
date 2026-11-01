import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "./components/site-header";

export const metadata: Metadata = {
  title: "CSP Lab Manager",
  description:
    "Self-hosted console for Content Security Policy report-uri reports. Deploy with Docker Compose, Postgres, and Valkey.",
};

const ENDPOINT_URL =
  "https://reports.example/endpoint/storefront?apiKey=7f3c…";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="manager-hero">
          <div className="manager-copy">
            <h1>An address for every report-uri.</h1>
            <p className="hero-lede">
              CSP Lab Manager is an open-source console for Content Security
              Policy reports. Docker Compose runs it with a Postgres container
              and a Valkey container. Create an endpoint for each app, paste
              that URL into the <code>report-uri</code> parameter, and the
              violations land in one place.
            </p>
          </div>

          <div className="paste-block">
            <span className="paste-label">report-uri</span>
            <span className="paste-url">{ENDPOINT_URL}</span>
            <span className="paste-note">
              Example only. Your endpoint uses your host, slug, and key.
            </span>
          </div>

          <div className="compose-block">
            <p>
              The{" "}
              <Link href="/docs#quickstart">quickstart</Link> downloads the
              Compose files and lists each value in <code>.env</code>.
            </p>
            <span className="compose-cmd">docker compose up -d</span>
          </div>

          <div className="manager-actions">
            <Link className="run-button" href="/docs">
              Read the docs
            </Link>
            <a
              className="switch-link"
              href="https://github.com/csp-lab/csp-lab-manager"
            >
              Source
            </a>
            <Link className="switch-link" href="/enforced">
              Open the live lab
            </Link>
          </div>
        </section>

        <section className="manager-demo" aria-labelledby="demo-heading">
          <h2 id="demo-heading">Watch the console</h2>
          <div className="manager-player">
            <iframe
              src="https://www.youtube-nocookie.com/embed/mdaTi4ZxMe0"
              title="CSP Lab Manager video demonstration"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>

        <section className="service-row" aria-label="Containers">
          <article className="service">
            <h2>Postgres</h2>
            <p>
              <code>postgres:16</code> stores endpoints, users, and the
              violation reports posted to them.
            </p>
          </article>
          <article className="service">
            <h2>Valkey</h2>
            <p>
              Limits ingest to 100 requests per 10 seconds for each client IP
              and endpoint. If Valkey is unreachable, ingest responds{" "}
              <code>503</code>.
            </p>
          </article>
          <article className="service">
            <h2>App</h2>
            <p>
              <code>quay.io/csp-lab/csp-lab-manager</code>. Startup applies
              migrations and seeds one superadmin when none exists.
            </p>
          </article>
        </section>

        <section className="manager-steps">
          <h2>Put an endpoint in the header</h2>
          <ol>
            <li>
              <strong>Start the stack.</strong>{" "}
              <code>docker compose up -d</code> runs Postgres, Valkey, and the
              app. The <Link href="/docs#quickstart">quickstart</Link> has the
              files and each <code>.env</code> value.
            </li>
            <li>
              <strong>Create an endpoint.</strong> Each one has an app name, a
              slug, and an API key.
            </li>
            <li>
              <strong>Paste the URL.</strong> Browsers post to{" "}
              <code>/endpoint/&lt;slug&gt;?apiKey=&lt;key&gt;</code>. That URL
              is the <code>report-uri</code> value.
            </li>
            <li>
              <strong>Read what arrived.</strong> The explorer opens on the
              last 15 minutes. Filter by violated directive, blocked domain,
              and disposition, <code>enforce</code> or <code>report</code>.
            </li>
          </ol>
        </section>

        <section className="manager-close">
          <h2>Who sees a report</h2>
          <p>
            Admins and the superadmin manage endpoints and users. Viewers see
            only the endpoints assigned to them. The API key and the report URL
            stay with admins and the superadmin.
          </p>
          <p className="manager-note">
            On the app you deployed, sign in at <code>/admin/login</code>.{" "}
            <code>GET /api/health</code> returns{" "}
            <code>{`{ "status": "ok" }`}</code>.
          </p>
        </section>
      </main>
    </>
  );
}
