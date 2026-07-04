import { db } from "@/db";
import { memories } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const totalMemories = await db.select({ count: sql<number>`count(*)` }).from(memories);
  const byType = await db.select({
    type: memories.type,
    count: sql<number>`count(*)`,
  }).from(memories).groupBy(memories.type);

  const recentMemories = await db.select().from(memories).orderBy(desc(memories.createdAt)).limit(5);

  return {
    total: Number(totalMemories[0]?.count || 0),
    byType: byType.map(r => ({ type: r.type, count: Number(r.count) })),
    recent: recentMemories,
  };
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">LifeOS</h1>
              <p className="text-sm text-slate-400">AI-Powered Persistent Memory</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Powered by Cognee — giving AI persistent memory for the Cognee Hangover Hackathon 2026
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Total Memories"
            value={stats.total}
            icon="🧠"
            color="from-brand-500/20 to-brand-600/20"
          />
          <StatsCard
            label="Notes"
            value={stats.byType.find(t => t.type === "note")?.count || 0}
            icon="📝"
            color="from-emerald-500/20 to-emerald-600/20"
          />
          <StatsCard
            label="Files"
            value={stats.byType.find(t => t.type === "file")?.count || 0}
            icon="📄"
            color="from-amber-500/20 to-amber-600/20"
          />
          <StatsCard
            label="URLs"
            value={stats.byType.find(t => t.type === "url")?.count || 0}
            icon="🔗"
            color="from-rose-500/20 to-rose-600/20"
          />
        </div>

        {/* Quick Actions + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/add"
                className="glass-card glass-card-hover block p-4 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center text-lg group-hover:bg-brand-500/30 transition-colors">
                    ✏️
                  </div>
                  <div>
                    <p className="font-medium text-white">Add Memory</p>
                    <p className="text-xs text-slate-400">Save a note, file, or URL</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/ask"
                className="glass-card glass-card-hover block p-4 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg group-hover:bg-emerald-500/30 transition-colors">
                    🔍
                  </div>
                  <div>
                    <p className="font-medium text-white">Ask LifeOS</p>
                    <p className="text-xs text-slate-400">Recall from your memory</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/graph"
                className="glass-card glass-card-hover block p-4 rounded-xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg group-hover:bg-amber-500/30 transition-colors">
                    🕸️
                  </div>
                  <div>
                    <p className="font-medium text-white">Knowledge Graph</p>
                    <p className="text-xs text-slate-400">Visualize connections</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Memories / Timeline */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Memories</h2>
            {stats.recent.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-slate-300 font-medium">No memories yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Start by adding a note, uploading a file, or saving a URL.
                </p>
                <Link
                  href="/add"
                  className="inline-block mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
                >
                  Add Your First Memory
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent.map((memory, i) => (
                  <div
                    key={memory.id}
                    className="glass-card glass-card-hover rounded-xl p-4 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {memory.type === "note" ? "📝" : memory.type === "file" ? "📄" : "🔗"}
                        </span>
                        <div>
                          <p className="font-medium text-white">{memory.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {memory.content.slice(0, 120)}...
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(memory.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cognee Integration Status */}
        <div className="mt-8 glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">🧬 Cognee Integration</h2>
          <p className="text-sm text-slate-400 mb-4">
            This app integrates with Cognee for AI-powered persistent memory with semantic search and knowledge graphs.
            The Cognee Python service provides the AI layer; when it&apos;s running, you get full semantic recall and graph-based memory.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-brand-400 mb-2">Current Status</h3>
              <div id="cognee-status" className="text-sm text-slate-300">
                Checking Cognee service...
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-brand-400 mb-2">Configuration Fix</h3>
              <p className="text-xs text-slate-400">
                If you&apos;re getting <code className="text-red-400">LLMAPIKeyNotSetError</code> with Gemini,
                check the <code className="text-brand-300">cognee-service/</code> directory for the correct .env setup.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const links = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/add", label: "Add Memory", icon: "✏️" },
    { href: "/ask", label: "Ask LifeOS", icon: "🔍" },
    { href: "/graph", label: "Knowledge Graph", icon: "🕸️" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <span className="text-lg font-bold text-white">LifeOS</span>
      </div>

      <nav className="space-y-1 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-base">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>Cognee Hackathon 2026</p>
          <p className="mt-1">Persistent AI Memory</p>
        </div>
      </div>
    </aside>
  );
}

function StatsCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={`glass-card rounded-xl p-5 bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
