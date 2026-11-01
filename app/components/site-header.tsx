import Link from "next/link";

export default function SiteHeader({ current }: { current?: "docs" }) {
  return (
    <header className="topbar">
      <Link href="/" className="wordmark">
        <span className="wordmark-mark" aria-hidden="true" />
        CSP Lab
      </Link>
      <nav className="topbar-right" aria-label="Site">
        <Link
          className="switch-link"
          href="/docs"
          aria-current={current === "docs" ? "page" : undefined}
        >
          Docs
        </Link>
        <Link className="switch-link" href="/enforced">
          Live lab
        </Link>
      </nav>
    </header>
  );
}
