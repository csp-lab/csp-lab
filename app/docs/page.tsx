import type { Metadata } from "next";
import SiteHeader from "../components/site-header";

export const metadata: Metadata = {
  title: "Docs — CSP Lab Manager",
  description:
    "Deploy CSP Lab Manager with Docker Compose, Postgres, and Valkey, then point report-uri at an endpoint.",
};

export default function DocsPage() {
  return (
    <>
      <SiteHeader current="docs" />
      <main className="page">
        <article className="docs">
          <h1>CSP Lab Manager</h1>
          <p>
            Self-hosted console for receiving, filtering, and inspecting
            Content Security Policy <code>report-uri</code> reports. These
            instructions are for the app you deploy. Paths such as{" "}
            <code>/admin/login</code> belong to that app, not this page.
          </p>
          <p>
            Each endpoint is an app name with a slug and an API key. Browsers
            post reports to{" "}
            <code>POST /endpoint/&lt;slug&gt;?apiKey=&lt;key&gt;</code>. Admins
            and the superadmin manage endpoints and users. Viewers only see
            endpoints they are assigned to. Source:{" "}
            <a href="https://github.com/csp-lab/csp-lab-manager">
              github.com/csp-lab/csp-lab-manager
            </a>
            .
          </p>

          <nav className="doc-toc" aria-label="On this page">
            <a href="#quickstart">Quickstart</a>
            <a href="#ingest">Ingest</a>
            <a href="#console">Console</a>
            <a href="#scripts">Scripts</a>
          </nav>

          <h2 id="quickstart">Quickstart</h2>
          <p>
            Download <code>compose.yaml</code> and <code>.env.example</code>,
            copy the example to <code>.env</code>, and set the values below.
            Compose will not start without <code>.env</code>.
          </p>
          <pre className="doc-code">
            <code>
              {`mkdir csp-lab-manager && cd csp-lab-manager
curl -fsSLO https://raw.githubusercontent.com/csp-lab/csp-lab-manager/main/compose.yaml
curl -fsSLO https://raw.githubusercontent.com/csp-lab/csp-lab-manager/main/.env.example
cp .env.example .env`}
            </code>
          </pre>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col">What to set</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>POSTGRES_USER</td>
                  <td>
                    Postgres role name. <code>csplab</code> is fine.
                  </td>
                </tr>
                <tr>
                  <td>POSTGRES_PASSWORD</td>
                  <td>
                    Password for that role. Choose your own.
                  </td>
                </tr>
                <tr>
                  <td>POSTGRES_DB</td>
                  <td>
                    Database name. <code>csplab_db</code> is fine.
                  </td>
                </tr>
                <tr>
                  <td>POSTGRES_PORT</td>
                  <td>
                    Host port for Postgres. Leave <code>5432</code>.
                  </td>
                </tr>
                <tr>
                  <td>VALKEY_PASSWORD</td>
                  <td>
                    Password Valkey requires. Choose your own.
                  </td>
                </tr>
                <tr>
                  <td>DATABASE_URL</td>
                  <td>
                    Leave this line. It already expands{" "}
                    <code>
                      {
                        "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:${POSTGRES_PORT}/${POSTGRES_DB}"
                      }
                    </code>
                    .
                  </td>
                </tr>
                <tr>
                  <td>REDIS_URL</td>
                  <td>
                    Leave this line. It already expands{" "}
                    <code>{"redis://:${VALKEY_PASSWORD}@valkey:6379"}</code>.
                  </td>
                </tr>
                <tr>
                  <td>BETTER_AUTH_SECRET</td>
                  <td>
                    A new secret of at least 32 characters. Replace the value
                    that comes in the example file.
                  </td>
                </tr>
                <tr>
                  <td>BETTER_AUTH_URL</td>
                  <td>
                    Public address of the app. A dedicated domain such as{" "}
                    <code>https://csp-lab-manager.example.com</code>, or an
                    ngrok tunnel.
                  </td>
                </tr>
                <tr>
                  <td>SEED_ADMIN_USERNAME</td>
                  <td>
                    Username for the first superadmin. 3–20 letters, numbers, or
                    underscores, stored lowercase. <code>superadmin</code> is
                    fine.
                  </td>
                </tr>
                <tr>
                  <td>SEED_ADMIN_PASSWORD</td>
                  <td>
                    Password for that user, at least 8 characters. Replace the
                    value that comes in the example file.
                  </td>
                </tr>
                <tr>
                  <td>APP_PORT</td>
                  <td>
                    Host port where Compose exposes the app.{" "}
                    <code>3000</code> publishes it on port 3000 of the machine
                    running Docker.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Then start Postgres, Valkey, and the published image (
            <code>quay.io/csp-lab/csp-lab-manager</code>):
          </p>
          <pre className="doc-code">
            <code>docker compose up -d</code>
          </pre>
          <p>
            On startup the container rewrites <code>localhost</code> in{" "}
            <code>DATABASE_URL</code> to <code>postgres</code> and in{" "}
            <code>REDIS_URL</code> to <code>valkey</code>, applies migrations,
            and seeds one superadmin when none exists.
          </p>
          <p>
            Sign in at <code>/admin/login</code>. <code>/</code> redirects to{" "}
            <code>/admin</code>, which redirects to{" "}
            <code>/admin/endpoints</code>. <code>GET /api/health</code> returns{" "}
            <code>{`{ "status": "ok" }`}</code>.
          </p>
          <p>
            You can also{" "}
            <a href="https://github.com/csp-lab/csp-lab-manager">
              check the repo
            </a>
            ,{" "}
            <a href="https://github.com/csp-lab/csp-lab-manager/fork">
              fork it
            </a>
            , and{" "}
            <a href="https://github.com/csp-lab/csp-lab-manager/compare">
              submit a pull request
            </a>
            .
          </p>

          <h2 id="ingest">Ingest</h2>
          <pre className="doc-code">
            <code>
              {`POST /endpoint/<slug>?apiKey=<key>
Content-Type: application/csp-report`}
            </code>
          </pre>
          <p>
            <code>application/json</code> is also accepted. The body must be a{" "}
            <code>csp-report</code> object. A stored report responds{" "}
            <code>204</code>. Wrong or missing keys respond <code>401</code>. A
            bad body responds <code>400</code>. Any other content type responds{" "}
            <code>415</code>.
          </p>
          <p>
            The limiter allows 100 requests per 10 seconds per client IP and
            slug. It uses Valkey when <code>REDIS_URL</code> is set, and process
            memory otherwise. Memory only holds for one app process. If{" "}
            <code>REDIS_URL</code> is set and Valkey is down, ingest responds{" "}
            <code>503</code>. On ECS, set <code>connection_limit</code> on{" "}
            <code>DATABASE_URL</code> so the task count times that limit stays
            under <code>max_connections</code>, and point every task at the same{" "}
            <code>REDIS_URL</code>.
          </p>

          <h2 id="console">Console</h2>
          <h3>Endpoints</h3>
          <p>
            Cards show the stored report total, capped at <code>99+</code>. A
            green dot means a report arrived in the last hour. Sort by name or
            report count.
          </p>
          <h3>Report explorer</h3>
          <p>
            The default window is <code>now-15m</code> to <code>now</code>, with
            presets for 15 minutes, 1 hour, 24 hours, and 7 days. Filter by
            violated directive, blocked domain, and disposition (
            <code>enforce</code> or <code>report</code>). Sort newest, oldest,
            or domain. Refresh is off by default, or 5 seconds through 1 hour.
            The list shows up to 20 rows (1–1000). <strong>Unique only</strong>{" "}
            keeps one row per document, directive, blocked URI, and disposition.
          </p>
          <h3>Endpoint controls</h3>
          <p>
            Admins and the superadmin can copy the report URL, regenerate the
            key, assign viewers, clear reports, or delete the endpoint. Clear
            and delete require typing the slug. Admins and superadmins stay
            assigned to every endpoint.
          </p>
          <h3>Users</h3>
          <p>
            Admins and the superadmin can create <code>VIEWER</code> accounts.
            Only a superadmin can create or assign <code>ADMIN</code>. There is
            one superadmin, created by the seed. Nobody can delete themselves,
            and an admin cannot delete the superadmin.
          </p>

          <h2 id="scripts">Scripts</h2>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th scope="col">Command</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>docker compose up -d</td>
                  <td>
                    Start Postgres, Valkey, and the published app image. Needs a
                    filled-in <code>.env</code>.
                  </td>
                </tr>
                <tr>
                  <td>docker compose -f compose-dev.yaml up -d</td>
                  <td>Same stack, building the app image from the repo.</td>
                </tr>
                <tr>
                  <td>pnpm dev</td>
                  <td>Next.js dev server.</td>
                </tr>
                <tr>
                  <td>pnpm build / pnpm start</td>
                  <td>Production build and server.</td>
                </tr>
                <tr>
                  <td>pnpm lint</td>
                  <td>ESLint.</td>
                </tr>
                <tr>
                  <td>pnpm test</td>
                  <td>
                    <code>node:test</code> for <code>lib/*.test.ts</code>.
                  </td>
                </tr>
                <tr>
                  <td>pnpm db:migrate</td>
                  <td>Prisma migrate dev.</td>
                </tr>
                <tr>
                  <td>pnpm db:seed</td>
                  <td>Seed the superadmin.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </main>
    </>
  );
}
