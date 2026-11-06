import { ALLOWED_RANGES, ASSETS, getHistory } from "../../../lib/market-provider.js";

export const runtime = "nodejs";
export const maxDuration = 20;
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("asset") ?? "";
  const range = url.searchParams.get("range") ?? "2y";
  const asset = ASSETS.find((item) => item.id === id);
  if (!asset || !ALLOWED_RANGES.includes(range)) {
    return Response.json({ error: "Invalid asset or history window. Choose 1y, 2y or 5y." }, { status: 400 });
  }
  try {
    const history = await getHistory(asset, range);
    return Response.json({
      asset, ...history,
      notes: [
        "Indicative research data, not a licensed trading feed.",
        "Cryptocurrencies are a selected research cohort, not a live capitalization ranking.",
        "Equity exchanges and digital assets have different trading calendars."
      ]
    }, {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    return Response.json({ error: message, asset: id }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
