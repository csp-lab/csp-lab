"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "enforce" | "report-only";
type Status =
  | "idle"
  | "running"
  | "allowed"
  | "blocked"
  | "reported"
  | "missed"
  | "error";

type TestDef = {
  id: string;
  title: string;
  target: string;
  directive: string;
  expectation: "block" | "allow";
  hint?: string;
  run: () => Promise<boolean> | boolean | void;
  match: (event: SecurityPolicyViolationEvent) => boolean;
};

type StatusEntry = {
  status: Status;
  note?: string;
};

const STATUS_LABEL: Record<Status, string> = {
  idle: "Not run",
  running: "Running",
  allowed: "Allowed",
  blocked: "Blocked",
  reported: "Reported",
  missed: "No report",
  error: "Failed",
};

function isScriptDirective(event: SecurityPolicyViolationEvent) {
  return event.effectiveDirective.startsWith("script-src");
}

export default function TestBench({
  nonce,
  mode,
}: {
  nonce: string;
  mode: Mode;
}) {
  const [statuses, setStatuses] = useState<Record<string, StatusEntry>>({});
  const pendingRef = useRef<{
    id: string;
    match: (event: SecurityPolicyViolationEvent) => boolean;
    timer: number;
  } | null>(null);

  useEffect(() => {
    function onViolation(event: SecurityPolicyViolationEvent) {
      const pending = pendingRef.current;
      if (!pending || !pending.match(event)) return;

      window.clearTimeout(pending.timer);
      pendingRef.current = null;

      setStatuses((previous) => ({
        ...previous,
        [pending.id]: {
          status: mode === "report-only" ? "reported" : "blocked",
          note: `${event.effectiveDirective} · ${event.blockedURI || "inline"}`,
        },
      }));
    }

    document.addEventListener("securitypolicyviolation", onViolation);
    return () =>
      document.removeEventListener("securitypolicyviolation", onViolation);
  }, [mode]);

  function trigger(test: TestDef) {
    if (pendingRef.current) {
      window.clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }

    setStatuses((previous) => ({
      ...previous,
      [test.id]: { status: "running" },
    }));

    const timer = window.setTimeout(() => {
      if (pendingRef.current?.id !== test.id) return;
      pendingRef.current = null;
      setStatuses((previous) => ({
        ...previous,
        [test.id]:
          test.expectation === "allow"
            ? { status: "allowed", note: "Loaded without a violation" }
            : { status: "missed", note: "No violation event observed" },
      }));
    }, 2000);

    pendingRef.current = { id: test.id, match: test.match, timer };

    let outcome: Promise<boolean> | boolean | void;
    try {
      outcome = test.run();
    } catch {
      window.clearTimeout(timer);
      pendingRef.current = null;
      setStatuses((previous) => ({
        ...previous,
        [test.id]: { status: "error", note: "The test threw before running" },
      }));
      return;
    }

    if (test.expectation === "allow") {
      Promise.resolve(outcome as boolean)
        .then((ok) => {
          if (pendingRef.current?.id !== test.id) return;
          window.clearTimeout(timer);
          pendingRef.current = null;
          setStatuses((previous) => ({
            ...previous,
            [test.id]: ok
              ? { status: "allowed", note: "Loaded without a violation" }
              : { status: "error", note: "Blocked or request failed" },
          }));
        })
        .catch(() => {
          if (pendingRef.current?.id !== test.id) return;
          window.clearTimeout(timer);
          pendingRef.current = null;
          setStatuses((previous) => ({
            ...previous,
            [test.id]: { status: "error", note: "The request was refused" },
          }));
        });
    }
  }

  const tests: TestDef[] = [
    {
      id: "inline-handler",
      title: "Inline event handler",
      target: '<button onclick="window.__handlerRan = true">',
      directive: "script-src",
      expectation: "block",
      match: (event) =>
        isScriptDirective(event) &&
        (event.blockedURI === "inline" ||
          event.sample?.includes("__handlerRan") === true),
      run: () => {
        const button = document.createElement("button");
        button.setAttribute(
          "onclick",
          "window.__handlerRan = true; this.remove();",
        );
        document.body.appendChild(button);
        button.click();
        button.remove();
      },
    },
    {
      id: "remote-stylesheet",
      title: "Remote stylesheet",
      target: "example.org/theme.css",
      directive: "style-src",
      expectation: "block",
      match: (event) =>
        event.effectiveDirective.startsWith("style-src") &&
        event.blockedURI.includes("example.org"),
      run: () => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://example.org/theme.css";
        document.head.appendChild(link);
      },
    },
    {
      id: "remote-image",
      title: "Remote image",
      target: "picsum.photos/seed/csp-run/320/200",
      directive: "img-src",
      expectation: "block",
      match: (event) =>
        event.effectiveDirective.startsWith("img-src") &&
        event.blockedURI.includes("picsum.photos"),
      run: () => {
        const image = new Image();
        image.src = `https://picsum.photos/seed/csp-run-${Date.now()}/320/200`;
      },
    },
    {
      id: "remote-frame",
      title: "Cross-origin iframe",
      target: "example.org/?from=csp-run",
      directive: "frame-src",
      expectation: "block",
      match: (event) =>
        event.effectiveDirective.startsWith("frame-src") &&
        event.blockedURI.includes("example.org"),
      run: () => {
        const frame = document.createElement("iframe");
        frame.src = `https://example.org/?from=csp-run-${Date.now()}`;
        frame.hidden = true;
        document.body.appendChild(frame);
        window.setTimeout(() => frame.remove(), 10000);
      },
    },
    {
      id: "outbound-fetch",
      title: "Outbound fetch",
      target: "api.github.com/zen",
      directive: "connect-src",
      expectation: "block",
      match: (event) =>
        event.effectiveDirective.startsWith("connect-src") &&
        event.blockedURI.includes("api.github.com"),
      run: () => {
        fetch("https://api.github.com/zen").catch(() => undefined);
      },
    },
    {
      id: "nonce-script",
      title: "Inline script with the nonce",
      target: `nonce="${nonce.slice(0, 8)}…"`,
      directive: "script-src",
      expectation: "allow",
      hint: "Carries this response's nonce; expected to run",
      match: () => false,
      run: () =>
        new Promise<boolean>((resolve) => {
          const element = document.createElement("script");
          element.nonce = nonce;
          element.textContent = "window.__nonceScriptRan = true;";
          document.body.appendChild(element);
          element.remove();
          window.setTimeout(
            () =>
              resolve(
                (window as unknown as { __nonceScriptRan?: boolean })
                  .__nonceScriptRan === true,
              ),
            50,
          );
        }),
    },
    {
      id: "same-origin-fetch",
      title: "Same-origin fetch",
      target: "/api/csp-report (GET)",
      directive: "connect-src",
      expectation: "allow",
      hint: "Same origin; expected to pass",
      match: () => false,
      run: () =>
        fetch("/api/csp-report", { cache: "no-store" }).then(
          (response) => response.ok,
        ),
    },
    {
      id: "inline-style",
      title: "Inline style",
      target: 'style="background:#096b50"',
      directive: "style-src",
      expectation: "allow",
      hint: "Permitted by style-src's 'unsafe-inline'",
      match: () => false,
      run: () => {
        const swatch = document.createElement("div");
        swatch.setAttribute(
          "style",
          "position:fixed;width:1px;height:1px;opacity:0;background:#096b50",
        );
        document.body.appendChild(swatch);
        const applied =
          getComputedStyle(swatch).backgroundColor === "rgb(9, 107, 80)";
        swatch.remove();
        return applied;
      },
    },
  ];

  return (
    <>
      <div className="test-grid">
        {tests.map((test) => {
          const entry = statuses[test.id] ?? { status: "idle" as Status };
          return (
            <article className="test-card" key={test.id}>
              <div className="test-card-head">
                <h3>{test.title}</h3>
                <span className={`status-pill status-${entry.status}`}>
                  {STATUS_LABEL[entry.status]}
                </span>
              </div>
              <code className="test-target">{test.target}</code>
              {entry.note ? (
                <p className="test-note">{entry.note}</p>
              ) : (
                <p className="test-note test-note-quiet">
                  {test.hint ??
                    (mode === "enforce"
                      ? `Guarded by ${test.directive}`
                      : `Reported by ${test.directive}, still loads`)}
                </p>
              )}
              <button
                type="button"
                className="run-button"
                onClick={() => trigger(test)}
              >
                {entry.status === "idle" ? "Run test" : "Run again"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="bench-footnote">
        The same violations are printed in the browser console. The feed reads
        them from the server, which is what makes the round trip visible.
      </p>
    </>
  );
}
