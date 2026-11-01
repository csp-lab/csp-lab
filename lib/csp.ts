export type CspDirective = {
  name: string;
  value: string;
  note: string;
  reports?: boolean;
};

/**
 * The single source of truth for the policy. The middleware serialises this
 * into the response header, and the UI renders the same directives.
 *
 * `dev` relaxes two things required by Next.js development mode:
 * - 'unsafe-eval' for React Refresh
 * - ws:/wss: for the HMR socket
 */
export function getDirectives(nonce: string, dev: boolean): CspDirective[] {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'report-sample'",
    ...(dev ? ["'unsafe-eval'"] : []),
  ];

  return [
    {
      name: "default-src",
      value: "'self'",
      note: "Fallback for every request type not named below.",
    },
    {
      name: "script-src",
      value: scriptSources.join(" "),
      note: "Only scripts carrying this response's nonce, or scripts those scripts inject, may execute.",
      reports: true,
    },
    {
      name: "style-src",
      value: "'self' 'unsafe-inline'",
      note: "Own stylesheets and inline styles. Next.js needs inline styles in development.",
    },
    {
      name: "img-src",
      value: "'self' data: blob:",
      note: "Remote images are refused. This blocks the picsum.photos test on the page.",
      reports: true,
    },
    {
      name: "connect-src",
      value: dev ? "'self' ws: wss:" : "'self'",
      note: "fetch, XHR and WebSockets must stay on this origin.",
      reports: true,
    },
    {
      name: "font-src",
      value: "'self'",
      note: "Fonts are self-hosted by next/font, so no remote font host is needed.",
    },
    {
      name: "frame-src",
      value: "'self'",
      note: "Third-party iframes never load. This blocks example.org.",
      reports: true,
    },
    {
      name: "object-src",
      value: "'none'",
      note: "No plugins or embedded objects.",
    },
    {
      name: "base-uri",
      value: "'none'",
      note: "No <base> tag can rewrite relative URLs.",
    },
    {
      name: "form-action",
      value: "'self'",
      note: "Forms may only submit back to this origin.",
    },
    {
      name: "frame-ancestors",
      value: "'none'",
      note: "This page cannot be embedded by any other site.",
    },
    {
      name: "report-uri",
      value: "/api/csp-report",
      note: "The browser POSTs a violation report here after every refusal.",
      reports: true,
    },
  ];
}

/**
 * report-uri is the legacy reporting channel, but it is still supported by
 * every major browser and works over both HTTP and HTTPS.
 *
 * Chrome ignores report-uri whenever report-to is also present, and its
 * report-to delivery for CSP reports is unreliable, so this demo advertises
 * report-uri only.
 */
export function buildCsp(
  nonce: string,
  dev: boolean,
  allowDemoPlayer = false,
): string {
  return getDirectives(nonce, dev)
    .map((directive) => {
      const value =
        allowDemoPlayer && directive.name === "frame-src"
          ? `${directive.value} https://www.youtube-nocookie.com`
          : directive.value;
      return `${directive.name} ${value}`;
    })
    .join("; ");
}
