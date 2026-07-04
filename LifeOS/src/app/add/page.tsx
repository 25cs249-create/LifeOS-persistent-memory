"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type MemoryType = "note" | "file" | "url";

export default function AddMemoryPage() {
  const [activeTab, setActiveTab] = useState<MemoryType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setSaving(true);
    setResult(null);

    try {
      if (activeTab === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title || file.name);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          setResult({ success: true, message: `File uploaded! ${data.chunksCreated} chunks indexed, ${data.edgesCreated} relationships found. Cognee: ${data.cognee}` });
          setFile(null);
          setTitle("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          setResult({ success: false, message: data.error || "Upload failed" });
        }
      } else {
        const body: Record<string, string> = {
          type: activeTab,
          title: title || (activeTab === "url" ? url : "Untitled"),
          content: activeTab === "url" ? `URL: ${url}\n\n${content}` : content,
          source: activeTab === "url" ? url : "",
        };

        const res = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (res.ok) {
          setResult({ success: true, message: `Memory saved! ${data.chunksCreated} chunks indexed, ${data.edgesCreated} relationships found. Cognee: ${data.cognee}` });
          setTitle("");
          setContent("");
          setUrl("");
        } else {
          setResult({ success: false, message: data.error || "Save failed" });
        }
      }
    } catch (err) {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ key: MemoryType; label: string; icon: string }> = [
    { key: "note", label: "Quick Note", icon: "📝" },
    { key: "file", label: "Upload File", icon: "📄" },
    { key: "url", label: "Website URL", icon: "🔗" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Add Memory</h1>
          <p className="text-slate-400 text-sm mb-6">
            Save information to your persistent AI memory. Cognee will process it for semantic recall.
          </p>

          {/* Tab Selector */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                    : "glass-card text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  activeTab === "note"
                    ? "What do you want to remember?"
                    : activeTab === "file"
                    ? "File description (optional)"
                    : "Website name or description"
                }
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
              />
            </div>

            {/* URL Field (only for URL type) */}
            {activeTab === "url" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                />
              </div>
            )}

            {/* File Upload (only for file type) */}
            {activeTab === "file" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Upload File (TXT, PDF, Markdown)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700/50 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/50 transition-colors"
                >
                  <div className="text-3xl mb-2">📁</div>
                  {file ? (
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-300 font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        TXT, MD, PDF supported
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.markdown"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Content (not for file type) */}
            {activeTab !== "file" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={
                    activeTab === "note"
                      ? "Write your note here... Include facts, ideas, connections — anything you want LifeOS to remember."
                      : "Add notes about this website, key takeaways, or context for why you saved it..."
                  }
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all resize-none"
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={
                saving ||
                (activeTab === "note" && (!title || !content)) ||
                (activeTab === "file" && !file) ||
                (activeTab === "url" && (!url || !content))
              }
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-brand-600/25 disabled:shadow-none"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Processing with Cognee...
                </span>
              ) : (
                "💾 Remember This"
              )}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`p-4 rounded-xl text-sm ${
                  result.success
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}
              >
                {result.message}
              </div>
            )}
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
              link.href === "/add"
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
