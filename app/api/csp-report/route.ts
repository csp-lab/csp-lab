import { NextResponse } from "next/server";
import {
  addReports,
  clearReports,
  getReports,
  normalizePayload,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

/**
 * The demo's own reporting endpoint.
 *
 * The policy uses `report-uri /api/csp-report`, which sends
 * application/csp-report. The newer Reporting API shape
 * (application/reports+json) is also accepted for manual testing.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Expected a JSON report body.", { status: 400 });
  }

  const reports = normalizePayload(payload);
  if (reports.length === 0) {
    return new Response("Unrecognised report format.", { status: 400 });
  }

  addReports(reports);

  for (const report of reports) {
    console.log(
      `[csp] ${report.disposition ?? "enforce"} · ${report.directive} · ` +
        `${report.blockedURI || "(inline)"} · ${report.via}`,
    );
  }

  // Browsers ignore the body; 204 keeps the network panel quiet.
  return new Response(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json(getReports(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE() {
  clearReports();
  return NextResponse.json({ ok: true });
}
