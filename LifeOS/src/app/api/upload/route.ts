import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memories, searchIndex, knowledgeEdges } from "@/db/schema";
import { cogneeRememberFile, isCogneeAvailable } from "@/lib/cognee";

export const dynamic = "force-dynamic";

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const content = await file.text();
    const fileName = file.name;
    const fileType = fileName.split(".").pop()?.toLowerCase() || "txt";

    // Insert memory
    const [memory] = await db.insert(memories).values({
      type: "file",
      title: title || fileName,
      content,
      source: fileName,
      metadata: {
        fileName,
        fileType,
        fileSize: file.size,
      },
    }).returning();

    // Create search index chunks
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

    // Extract knowledge edges
    const edges = extractSimpleEdges(content, memory.id);
    if (edges.length > 0) {
      await db.insert(knowledgeEdges).values(edges);
    }

    // Try to send to Cognee service
    let cogneeResult = null;
    try {
      const cogneeAvailable = await isCogneeAvailable();
      if (cogneeAvailable) {
        cogneeResult = await cogneeRememberFile(content, fileName);
      }
    } catch {
      // Cognee not available
    }

    return NextResponse.json({
      memory,
      chunksCreated: chunks.length,
      edgesCreated: edges.length,
      cognee: cogneeResult ? "synced" : "local-only",
    }, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

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

  const hasPattern = /([A-Z][a-zA-Z\s]{2,40})\s+(?:has|have|had)\s+([a-zA-Z\s]{2,40})/g;
  while ((match = hasPattern.exec(text)) !== null) {
    edges.push({
      sourceEntity: match[1].trim(),
      relationship: "has",
      targetEntity: match[2].trim(),
      memoryId,
    });
  }

  return edges.slice(0, 20);
}
