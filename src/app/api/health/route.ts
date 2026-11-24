import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness: always 200 when the process is up (used by the Railway health check).
// Add ?deep=1 to also verify the database connection.
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep");
  if (!deep) return NextResponse.json({ status: "ok" });
  try {
    const { getPool } = await import("@/lib/db");
    await getPool().query("select 1");
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
