import { NextResponse } from "next/server";
import { isCogneeAvailable, resetCogneeAvailability } from "@/lib/cognee";

export const dynamic = "force-dynamic";

// GET /api/cognee-status - Check if Cognee service is available
export async function GET() {
  try {
    resetCogneeAvailability(); // Always re-check
    const available = await isCogneeAvailable();
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ available: false });
  }
}
