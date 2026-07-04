import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memories, knowledgeEdges, searchIndex } from "@/db/schema";
import { eq, desc, sql, like, or, and } from "drizzle-orm";
import { isCogneeAvailable, cogneeRemember, cogneeRememberFile } from "@/lib/cognee";

export const dynamic = "force-dynamic";

// GET /api/memories - List all memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = db.select().from(memories).orderBy(desc(memories.createdAt)).limit(limit).offset(offset);

    if (type) {
      const result = await db.select().from(memories).where(eq(memories.type, type)).orderBy(desc(memories.createdAt)).limit(limit).offset(offset);
      return NextResponse.json({ memories: result, total: result.length });
    }

    const result = await db.select().from(memories).orderBy(desc(memories.createdAt)).limit(limit).offset(offset);
    return NextResponse.json({ memories: result, total: result.length });
  } catch (error) {
    console.error("Error fetching memories:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

// POST /api/memories - Create a new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, content, source, metadata } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: "type, title, and content are required" },
        { status: 400 }
      );
    }

    // Insert memory
    const [memory] = await db.insert(memories).values({
      type,
      title,
      content,
      source: source || null,
      metadata: metadata || {},
    }).returning();

    // Create search index chunks (simple chunking by paragraphs/sentences)
    const chunks = chunkText(content, 500);
    if (chunks.length > 0) {
      await db.insert(searchIndex).values(
        chunks.map((chunk, index) => ({
          memoryId: memory.id,
          contentChunk: chunk,
          chunkIndex: index,
        }))
      );
    }

    // Extract simple knowledge edges (entities and relationships)
    const edges = extractSimpleEdges(content, memory.id);
    if (edges.length > 0) {
      await db.insert(knowledgeEdges).values(edges);
    }

    // Try to also send to Cognee service if available
    let cogneeResult = null;
    try {
      const cogneeAvailable = await isCogneeAvailable();
      if (cogneeAvailable) {
        if (type === "file") {
          cogneeResult = await cogneeRememberFile(content, source || title);
        } else {
          cogneeResult = await cogneeRemember(content);
        }
      }
    } catch (e) {
      console.log("Cognee service not available, using local storage only");
    }

    return NextResponse.json({
      memory,
      chunksCreated: chunks.length,
      edgesCreated: edges.length,
      cognee: cogneeResult ? "synced" : "local-only",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating memory:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}

// Helper: Chunk text into smaller pieces for search indexing
function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = (currentChunk + " " + sentence).trim();
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Helper: Extract simple entity-relationship-entity triples from text
function extractSimpleEdges(text: string, memoryId: number): Array<{
  sourceEntity: string;
  relationship: string;
  targetEntity: string;
  memoryId: number;
}> {
  const edges: Array<{
    sourceEntity: string;
    relationship: string;
    targetEntity: string;
    memoryId: number;
  }> = [];

  // Extract "X is Y" patterns
  const isPattern = /([A-Z][a-zA-Z\s]{2,40})\s+(?:is|are|was|were)\s+(?:a|an|the)?\s*([A-Z][a-zA-Z\s]{2,40})/g;
  let match;
  while ((match = isPattern.exec(text)) !== null) {
    edges.push({
      sourceEntity: match[1].trim(),
      relationship: "is",
      targetEntity: match[2].trim(),
      memoryId,
    });
  }

  // Extract "X has Y" patterns
  const hasPattern = /([A-Z][a-zA-Z\s]{2,40})\s+(?:has|have|had)\s+([a-zA-Z\s]{2,40})/g;
  while ((match = hasPattern.exec(text)) !== null) {
    edges.push({
      sourceEntity: match[1].trim(),
      relationship: "has",
      targetEntity: match[2].trim(),
      memoryId,
    });
  }

  // Extract "X verb Y" patterns (created, built, manages, etc.)
  const verbPattern = /([A-Z][a-zA-Z\s]{2,40})\s+(created|built|manages|developed|leads|founded|designed|wrote|published)\s+([a-zA-Z\s]{2,40})/g;
  while ((match = verbPattern.exec(text)) !== null) {
    edges.push({
      sourceEntity: match[1].trim(),
      relationship: match[2],
      targetEntity: match[3].trim(),
      memoryId,
    });
  }

  return edges.slice(0, 20); // Limit to 20 edges per memory
}
