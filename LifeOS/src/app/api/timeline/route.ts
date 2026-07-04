import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/timeline - Get memories grouped by date for timeline view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const allMemories = await db
      .select()
      .from(memories)
      .orderBy(desc(memories.createdAt))
      .limit(limit);

    // Group by date
    const grouped: Record<string, Array<{
      id: number;
      type: string;
      title: string;
      content: string;
      source: string | null;
      createdAt: Date;
    }>> = {};

    for (const memory of allMemories) {
      const date = new Date(memory.createdAt).toISOString().split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        id: memory.id,
        type: memory.type,
        title: memory.title,
        content: memory.content,
        source: memory.source,
        createdAt: memory.createdAt,
      });
    }

    // Convert to timeline format
    const timeline = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));

    return NextResponse.json({
      timeline,
      total: allMemories.length,
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}
