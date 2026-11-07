import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "bcpd-one",
    version: "1.1.0",
    time: new Date().toISOString(),
    marketData: "not-tested",
    note: "Process heartbeat only; market provider availability is checked per request.",
  }, { headers: { "Cache-Control": "no-store" } });
}
