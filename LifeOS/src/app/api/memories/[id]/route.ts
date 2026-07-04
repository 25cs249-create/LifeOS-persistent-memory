import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { memories, searchIndex, knowledgeEdges } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/memories/[id] - Get a single memory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memoryId = parseInt(id);

    const [memory] = await db.select().from(memories).where(eq(memories.id, memoryId));

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    const chunks = await db.select().from(searchIndex).where(eq(searchIndex.memoryId, memoryId));
    const edges = await db.select().from(knowledgeEdges).where(eq(knowledgeEdges.memoryId, memoryId));

    return NextResponse.json({ memory, chunks, edges });
  } catch (error) {
    console.error("Error fetching memory:", error);
    return NextResponse.json({ error: "Failed to fetch memory" }, { status: 500 });
  }
}

// DELETE /api/memories/[id] - Delete a memory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memoryId = parseInt(id);

    // Delete related records first (cascade should handle this, but being explicit)
    await db.delete(searchIndex).where(eq(searchIndex.memoryId, memoryId));
    await db.delete(knowledgeEdges).where(eq(knowledgeEdges.memoryId, memoryId));
    await db.delete(memories).where(eq(memories.id, memoryId));

    return NextResponse.json({ status: "ok", message: "Memory deleted" });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
