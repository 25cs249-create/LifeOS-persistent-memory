import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeEdges, memories } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { cogneeGraph, isCogneeAvailable } from "@/lib/cognee";

export const dynamic = "force-dynamic";

// GET /api/graph - Get knowledge graph data
export async function GET() {
  try {
    // Try Cognee graph first
    let cogneeGraphData = null;
    let cogneeAvailable = false;
    try {
      cogneeAvailable = await isCogneeAvailable();
      if (cogneeAvailable) {
        const cogneeResult = await cogneeGraph();
        if (cogneeResult?.graph) {
          cogneeGraphData = cogneeResult.graph;
        }
      }
    } catch {
      // Cognee not available
    }

    // Get local knowledge edges
    const edges = await db
      .select()
      .from(knowledgeEdges)
      .orderBy(desc(knowledgeEdges.createdAt))
      .limit(200);

    // Get all memories referenced by edges
    const memoryIds = [...new Set(edges.map(e => e.memoryId).filter(Boolean))] as number[];

    let memoryMap: Record<number, { title: string; type: string }> = {};
    if (memoryIds.length > 0) {
      const mems = await db
        .select({ id: memories.id, title: memories.title, type: memories.type })
        .from(memories)
        .where(sql`${memories.id} IN ${memoryIds}`);

      for (const m of mems) {
        memoryMap[m.id] = { title: m.title, type: m.type };
      }
    }

    // Build graph data structure for visualization
    const nodeSet = new Set<string>();
    const graphEdges: Array<{
      source: string;
      target: string;
      relationship: string;
      memoryTitle?: string;
    }> = [];

    for (const edge of edges) {
      nodeSet.add(edge.sourceEntity);
      nodeSet.add(edge.targetEntity);
      graphEdges.push({
        source: edge.sourceEntity,
        target: edge.targetEntity,
        relationship: edge.relationship,
        memoryTitle: edge.memoryId ? memoryMap[edge.memoryId]?.title : undefined,
      });
    }

    const nodes = Array.from(nodeSet).map(name => ({ name }));

    return NextResponse.json({
      nodes,
      edges: graphEdges,
      totalNodes: nodes.length,
      totalEdges: graphEdges.length,
      cogneeAvailable,
      cogneeGraphData,
    });
  } catch (error) {
    console.error("Error fetching graph:", error);
    return NextResponse.json({ error: "Failed to fetch graph data" }, { status: 500 });
  }
}
