import { pgTable, serial, varchar, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";

export const memories = pgTable(
  "memories",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 20 }).notNull(), // 'note', 'file', 'url'
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    source: varchar("source", { length: 1000 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("memories_type_idx").on(table.type),
    index("memories_created_at_idx").on(table.createdAt),
  ]
);

export const knowledgeEdges = pgTable(
  "knowledge_edges",
  {
    id: serial("id").primaryKey(),
    sourceEntity: varchar("source_entity", { length: 500 }).notNull(),
    relationship: varchar("relationship", { length: 500 }).notNull(),
    targetEntity: varchar("target_entity", { length: 500 }).notNull(),
    memoryId: integer("memory_id").references(() => memories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("knowledge_edges_source_idx").on(table.sourceEntity),
    index("knowledge_edges_target_idx").on(table.targetEntity),
  ]
);

export const searchIndex = pgTable(
  "search_index",
  {
    id: serial("id").primaryKey(),
    memoryId: integer("memory_id").references(() => memories.id, { onDelete: "cascade" }).notNull(),
    contentChunk: text("content_chunk").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
  },
  (table) => [
    index("search_index_memory_id_idx").on(table.memoryId),
  ]
);
