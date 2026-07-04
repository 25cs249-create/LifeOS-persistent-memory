"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
  type: string;
  memory: {
    id: number;
    type: string;
    title: string;
    content: string;
    source: string | null;
    createdAt: string;
  };
  matchedContent: string;
  relevance: number;
  source: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  cogneeAvailable: boolean;
  cogneeResults?: string[];
}

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSearchResult(data);
      } else {
        setError(data.error || "Search failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const suggestedQueries = [
    "What have I learned recently?",
    "Summarize my project notes",
    "What connections exist in my knowledge?",
    "Find all file uploads",
    "What URLs have I saved?",
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Ask LifeOS</h1>
          <p className="text-slate-400 text-sm mb-6">
            Recall information semantically from your persistent AI memory.
          </p>

          {/* Search Bar */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your memories..."
                className="w-full pl-5 pr-24 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all text-lg"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? "..." : "Recall →"}
              </button>
            </div>

            {/* Suggested Queries */}
            <div className="flex flex-wrap gap-2 mt-4">
              {suggestedQueries.map(sq => (
                <button
                  key={sq}
                  onClick={() => { setQuery(sq); }}
                  className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/30 rounded-lg text-xs text-slate-400 hover:text-white hover:border-brand-500/30 transition-all"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="glass-card rounded-2xl p-8 text-center animate-fade-in">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3" />
              <p className="text-slate-300">Searching your memories...</p>
              <p className="text-xs text-slate-500 mt-1">
                Querying local index and Cognee semantic search
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {searchResult && !loading && (
            <div className="space-y-4 animate-fade-in">
              {/* Result Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Found <span className="text-white font-semibold">{searchResult.total}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                    searchResult.cogneeAvailable
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      searchResult.cogneeAvailable ? "bg-emerald-400" : "bg-amber-400"
                    }`} />
                    Cognee {searchResult.cogneeAvailable ? "Active" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Cognee Results */}
              {searchResult.cogneeResults && searchResult.cogneeResults.length > 0 && (
                <div className="glass-card rounded-xl p-5 border-l-4 border-brand-500">
                  <h3 className="text-sm font-semibold text-brand-400 mb-2 flex items-center gap-2">
                    <span>🧬</span> Cognee Semantic Results
                  </h3>
                  <div className="space-y-3">
                    {searchResult.cogneeResults.map((result, i) => (
                      <div key={i} className="text-sm text-slate-300 bg-slate-900/50 rounded-lg p-3">
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local Results */}
              {searchResult.results.map((result, i) => (
                <div
                  key={result.memory.id}
                  className="glass-card glass-card-hover rounded-xl p-5 transition-all duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">
                      {result.memory.type === "note" ? "📝" : result.memory.type === "file" ? "📄" : "🔗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{result.memory.title}</h3>
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                          {result.memory.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-3 mb-2">
                        {result.matchedContent}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {result.memory.source && (
                          <span className="truncate max-w-[200px]">📎 {result.memory.source}</span>
                        )}
                        <span>📅 {new Date(result.memory.createdAt).toLocaleDateString()}</span>
                        <span>🎯 Relevance: {(result.relevance * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* No results */}
              {searchResult.results.length === 0 && !searchResult.cogneeResults?.length && (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="text-4xl mb-3">🤔</div>
                  <p className="text-slate-300 font-medium">No memories found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Try a different search term, or add more memories first.
                  </p>
                  <Link
                    href="/add"
                    className="inline-block mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Add a Memory
                  </Link>
                </div>
              )}
            </div>
          )}
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
    <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 p-6 flex flex-col shrink-0">
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              link.href === "/ask"
                ? "text-white bg-brand-600/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <span className="text-base">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>Cognee Hackathon 2026</p>
        </div>
      </div>
    </aside>
  );
}
