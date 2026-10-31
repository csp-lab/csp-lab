import type { Metadata } from "next";
import Demo from "../components/demo";

export const metadata: Metadata = {
  title: "CSP Lab — report-only twin",
  description:
    "The same strict policy in report-only mode: violations are reported, nothing is blocked.",
};

export default function ReportOnlyPage() {
  return <Demo mode="report-only" />;
}
