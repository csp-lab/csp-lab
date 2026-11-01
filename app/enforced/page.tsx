import type { Metadata } from "next";
import Demo from "../components/demo";

export const metadata: Metadata = {
  title: "CSP Lab — a policy that reports on itself",
  description:
    "A live Content Security Policy demo: strict enforcement, deliberate violations, and report-uri delivery to the app's own endpoint.",
};

export default function EnforcedPage() {
  return <Demo mode="enforce" />;
}
