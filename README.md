# CSP Lab

A Next.js demo of a strict Content Security Policy that:

- blocks real content in the page (remote image, third-party iframe, inline
  script, third-party script),
- gives every response a fresh nonce so Next.js keeps working,
- reports every refusal through `report-uri`, and
- receives those reports at its own `/api/csp-report` endpoint, displaying them
  live in the page.

There is also a `/report-only` twin that sends the same policy as
`Content-Security-Policy-Report-Only`, so you can compare "blocked" with
"reported but allowed" side by side.

## Run it

```bash
npm install
npm run dev
```

Open the URL printed by Next.js (http://localhost:3000 unless the port is in
use).

Then open `/report-only` from the link in the top bar.

```bash
npm run build
npm start
```

## What is going on

### 1. The header is generated per request

`middleware.ts` creates a random nonce, builds the policy from `lib/csp.ts`, and
sets one response header:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' 'report-sample'; …; report-uri /api/csp-report
```

Next.js reads the nonce from the request's CSP header and stamps its own script
tags with it. Raw inline scripts, scripts without a nonce, remote images,
cross-origin frames, and outbound `fetch` calls are refused by the browser.

`report-uri` is the legacy reporting channel, but every major browser still
supports it and it works over both HTTP and HTTPS. That makes the demo work
everywhere without a certificate or extra Reporting API headers. See
[Why `report-uri`](#why-report-uri) below.

### 2. The content tries to break out

On load, the page deliberately includes:

- an `<img>` from `picsum.photos` → blocked by `img-src`
- an `<iframe>` from `example.org` → blocked by `frame-src`
- a raw inline `<script>` without a nonce → blocked by `script-src`
- a `<script src="https://code.jquery.com/…">` without a nonce → blocked by
  `script-src` (`strict-dynamic` does not trust parser-inserted scripts)

The "Trigger a violation" panel adds more, including an inline event handler,
a remote stylesheet, a remote image, a cross-origin iframe, and an outbound
`fetch`. It also includes three controls that should succeed: an inline script
carrying the page's nonce, an inline style, and a same-origin `fetch`.

## The reporting endpoint

`app/api/csp-report/route.ts` accepts the `report-uri` wire format:

```http
POST /api/csp-report
Content-Type: application/csp-report

{ "csp-report": { … } }
```

It also accepts the newer Reporting API shape the browser would send for
`report-to` (`application/reports+json`, an array of
`{ "type": "csp-violation", "body": { … } }`), which is useful for manual
testing even though the policy does not use `report-to`.

`lib/reports.ts` normalises both formats into one shape and keeps the latest 250
in process memory. The feed polls the endpoint every 1.5 seconds.

```bash
# See what has arrived
curl http://localhost:3000/api/csp-report

# Clear the in-memory store
curl -X DELETE http://localhost:3000/api/csp-report

# Post a report by hand
curl -X POST http://localhost:3000/api/csp-report \
  -H 'Content-Type: application/csp-report' \
  --data '{"csp-report":{"effective-directive":"img-src","blocked-uri":"https://example.com/x.png","document-uri":"http://localhost:3000/","disposition":"enforce"}}'
```

## Why `report-uri`

`report-to` is the modern replacement for `report-uri`, but using it for CSP
reporting has practical problems:

- Chrome ignores `report-uri` whenever `report-to` is present, so adding both
  removes the fallback.
- Chrome's CSP `report-to` delivery is currently unreliable
  ([Chromium issue 40702166](https://issues.chromium.org/issues/40702166)), even
  over trusted HTTPS.
- `report-to` needs a secure context; `report-uri` does not.

The policy therefore advertises `report-uri` only. That keeps the demo working
in Chrome, Firefox, and Safari over plain HTTP or HTTPS, with no extra headers
and no certificate setup.

## Files

| Path | Purpose |
| --- | --- |
| `middleware.ts` | Per-request nonce and CSP header |
| `lib/csp.ts` | Single source of truth for the directives |
| `lib/reports.ts` | Report normalisation and in-memory store |
| `app/api/csp-report/route.ts` | The app's own report endpoint (POST/GET/DELETE) |
| `app/components/demo.tsx` | Page shell, policy viewer, deliberately broken markup |
| `app/components/test-bench.tsx` | Interactive violation triggers and per-test status |
| `app/components/report-feed.tsx` | Live report feed |
| `app/report-only/page.tsx` | Report-only twin |

## Details worth knowing

- **The nonce is deliberately exposed** in the page so the "Inline script with
  the nonce" test can prove that the trusted path still works. A nonce is
  per-response and not a secret from the page.
- **`strict-dynamic` trusts scripts created by already-trusted scripts.** That
  is why the dynamic, nonce-less `<script>` injection is not used as a "blocked"
  test: the browser would allow it. The blocked inline script test is an
  inline event handler instead, which `strict-dynamic` does not permit.
- **Duplicate reports are normal.** React preloads the remote image, so the
  browser can report the same URL more than once. Real CSP reporting can
  de-duplicate or batch reports differently per browser.
- **Reports are in memory.** They survive page reloads but not a server
  restart, and are not shared between serverless instances. Wire the store to
  a database or queue for production.
- **Dev-only relaxations.** `script-src` gets `'unsafe-eval'` and `connect-src`
  gets `ws:`/`wss:` in development for React Refresh and HMR. Neither is
  present in a production build.
- **Styles use `'unsafe-inline'`.** That keeps Next's development styling
  simple, but it means inline styles are not a useful blocked-content test in
  this demo. Move to nonce/hash-based styles if you need a stricter policy.
