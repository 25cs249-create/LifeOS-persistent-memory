import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memories, searchIndex, knowledgeEdges } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { cogneeRecall, isCogneeAvailable } from "@/lib/cognee";

export const dynamic = "force-dynamic";

// POST /api/search - Search/recall memories
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    // Try Cognee semantic search first
    let cogneeResults: string[] = [];
    let cogneeAvailable = false;
    try {
      cogneeAvailable = await isCogneeAvailable();
      if (cogneeAvailable) {
        const cogneeResult = await cogneeRecall(query);
        if (cogneeResult?.results) {
          cogneeResults = cogneeResult.results;
        }
      }
    } catch {
      // Cognee not available, fall back to local search
    }

    // Local PostgreSQL search using full-text search and ILIKE
    const searchTerms = query.split(/\s+/).filter(Boolean);

    // Full-text search on search index chunks
    const chunkResults = await db
      .select({
        memoryId: searchIndex.memoryId,
        contentChunk: searchIndex.contentChunk,
        relevance: sql<number>`1`,
      })
      .from(searchIndex)
      .where(
        sql`${searchIndex.contentChunk} ILIKE ${"%" + query + "%"}`
      )
      .limit(20);

    // Also search by individual terms for better recall
    if (searchTerms.length > 1) {
      const termConditions = searchTerms.map(term =>
        sql`${searchIndex.contentChunk} ILIKE ${"%" + term + "%"}`
      );
      const termResults = await db
        .select({
          memoryId: searchIndex.memoryId,
          contentChunk: searchIndex.contentChunk,
        })
        .from(searchIndex)
        .where(sql.join(termConditions, sql` OR `))
        .limit(20);

      // Merge results, avoiding duplicates
      const existingIds = new Set(chunkResults.map(r => `${r.memoryId}-${r.contentChunk}`));
      for (const tr of termResults) {
        if (!existingIds.has(`${tr.memoryId}-${tr.contentChunk}`)) {
          chunkResults.push({ ...tr, relevance: 0.5 });
        }
      }
    }

    // Also search in titles
    const titleResults = await db
      .select()
      .from(memories)
      .where(sql`${memories.title} ILIKE ${"%" + query + "%"} OR ${memories.content} ILIKE ${"%" + query + "%"}`)
      .orderBy(desc(memories.createdAt))
      .limit(20);

    // Get unique memory IDs from chunk results
    const memoryIds = [...new Set(chunkResults.map(r => r.memoryId))];
    const memoriesFromChunks = memoryIds.length > 0
      ? await db.select().from(memories).where(sql`${memories.id} IN ${memoryIds}`)
      : [];

    // Build final results
    const results = [
      ...titleResults.map(m => ({
        type: "memory" as const,
        memory: m,
        matchedContent: m.content.slice(0, 200),
        relevance: 1.0,
        source: "title",
      })),
      ...memoriesFromChunks
        .filter(m => !titleResults.find(t => t.id === m.id))
        .map(m => {
          const chunks = chunkResults.filter(c => c.memoryId === m.id);
          return {
            type: "memory" as const,
            memory: m,
            matchedContent: chunks[0]?.contentChunk || m.content.slice(0, 200),
            relevance: chunks[0]?.relevance || 0.5,
            source: "content",
          };
        }),
    ];

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return NextResponse.json({
      query,
      results: results.slice(0, 20),
      total: results.length,
      cogneeAvailable,
      cogneeResults: cogneeResults.length > 0 ? cogneeResults : undefined,
    });
  } catch (error) {
    console.error("Error searching memories:", error);
    return NextResponse.json({ error: "Failed to search memories" }, { status: 500 });
  }
}
