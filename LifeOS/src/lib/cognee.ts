/**
 * Cognee Service Client
 *
 * This module provides a client for communicating with the Cognee Python service.
 * When the Cognee service is running, it provides AI-powered semantic memory.
 * When it's not running, the app falls back to PostgreSQL-based storage and search.
 */

const COGNEE_SERVICE_URL = process.env.COGNEE_SERVICE_URL || "http://localhost:8001";

export interface CogneeHealth {
  status: string;
  llm_provider: string;
  llm_model: string;
  embedding_provider: string;
  embedding_model: string;
  vector_db: string;
}

export interface CogneeRememberResult {
  status: string;
  message: string;
}

export interface CogneeRecallResult {
  status: string;
  results: string[];
}

export interface CogneeGraphResult {
  status: string;
  graph: unknown;
}

let cachedAvailable: boolean | null = null;

export async function isCogneeAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const res = await fetch(`${COGNEE_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    cachedAvailable = res.ok;
    return cachedAvailable;
  } catch {
    cachedAvailable = false;
    return false;
  }
}

export function resetCogneeAvailability(): void {
  cachedAvailable = null;
}

export async function cogneeRemember(
  text: string,
  dataset = "lifeos"
): Promise<CogneeRememberResult | null> {
  const available = await isCogneeAvailable();
  if (!available) return null;
  const res = await fetch(`${COGNEE_SERVICE_URL}/cognee/remember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dataset }),
  });
  if (!res.ok) throw new Error(`Cognee remember failed: ${await res.text()}`);
  return res.json();
}

export async function cogneeRememberFile(
  content: string,
  filename: string,
  dataset = "lifeos"
): Promise<CogneeRememberResult | null> {
  const available = await isCogneeAvailable();
  if (!available) return null;
  const res = await fetch(`${COGNEE_SERVICE_URL}/cognee/remember-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename, dataset }),
  });
  if (!res.ok) throw new Error(`Cognee remember-file failed: ${await res.text()}`);
  return res.json();
}

export async function cogneeRecall(
  query: string,
  dataset = "lifeos"
): Promise<CogneeRecallResult | null> {
  const available = await isCogneeAvailable();
  if (!available) return null;
  const res = await fetch(`${COGNEE_SERVICE_URL}/cognee/recall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, dataset }),
  });
  if (!res.ok) throw new Error(`Cognee recall failed: ${await res.text()}`);
  return res.json();
}

export async function cogneeGraph(
  dataset = "lifeos"
): Promise<CogneeGraphResult | null> {
  const available = await isCogneeAvailable();
  if (!available) return null;
  const res = await fetch(`${COGNEE_SERVICE_URL}/cognee/graph?dataset=${dataset}`);
  if (!res.ok) throw new Error(`Cognee graph failed: ${await res.text()}`);
  return res.json();
}
