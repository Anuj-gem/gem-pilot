"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface GEMSubmission {
  id: string;
  user_id: string;
  show_id: string;
  title: string | null;
  pitch: string | null;
  season_plan: string | null;
  casting_vision: string | null;
  imdb_url: string | null;
  collaborators: { name: string; email: string }[];
  concept_image_urls: string[];
  status: "pending_review" | "published";
  admin_notes: string | null;
  created_at: string;
  published_at: string | null;
}

interface GEMComment {
  id: string;
  author_name: string;
  is_gem_team: boolean;
  body: string;
  created_at: string;
}

function SubmissionCard({ sub, onPublish }: {
  sub: GEMSubmission;
  onPublish: (showId: string, notes: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(sub.status === "pending_review");
  const [notes, setNotes] = useState(sub.admin_notes || "");
  const [publishing, setPublishing] = useState(false);
  const [comments, setComments] = useState<GEMComment[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const loadComments = async () => {
    if (commentsLoaded) return;
    const res = await fetch(`/api/submissions/${sub.show_id}/comments`);
    if (res.ok) {
      const { comments: c } = await res.json();
      setComments(c || []);
    }
    setCommentsLoaded(true);
  };

  const handleExpand = () => {
    if (!expanded) loadComments();
    setExpanded(!expanded);
  };

  const sendReply = async () => {
    if (!replyBody.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/submissions/${sub.show_id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setReplyBody("");
      }
    } finally {
      setSendingReply(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish(sub.show_id, notes);
    } finally {
      setPublishing(false);
    }
  };

  const title = sub.title || sub.show_id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isPending = sub.status === "pending_review";

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isPending ? "border-zinc-300" : "border-zinc-200 opacity-75"}`}>

      {/* Header row */}
      <button
        type="button"
        onClick={handleExpand}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 w-2 h-2 rounded-full ${isPending ? "bg-zinc-900 animate-pulse" : "bg-emerald-500"}`} />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-950 truncate">{title}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {new Date(sub.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
              {sub.imdb_url && <> &middot; <a href={sub.imdb_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-700" onClick={(e) => e.stopPropagation()}>IMDb</a></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isPending ? "bg-zinc-100 text-zinc-600" : "bg-emerald-50 text-emerald-700"}`}>
            {isPending ? "Pending Review" : "Published"}
          </span>
          {expanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 p-5 space-y-5">

          {/* Pitch */}
          {sub.pitch && (
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Pitch</p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{sub.pitch}</p>
            </div>
          )}

          {/* Season Plan */}
          {sub.season_plan && (
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Season 1 Framework</p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{sub.season_plan}</p>
            </div>
          )}

          {/* Casting */}
          {sub.casting_vision && (
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Dream Casting</p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{sub.casting_vision}</p>
            </div>
          )}

          {/* Collaborators */}
          {sub.collaborators?.length > 0 && (
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Collaborators</p>
              <div className="space-y-1">
                {sub.collaborators.map((c, i) => (
                  <p key={i} className="text-sm text-zinc-700">{c.name} &mdash; {c.email}</p>
                ))}
              </div>
            </div>
          )}

          {/* Concept images */}
          {sub.concept_image_urls?.length > 0 && (
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Visual Concepts</p>
              <div className="grid grid-cols-5 gap-2">
                {sub.concept_image_urls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`Concept ${i + 1}`} className="aspect-square w-full object-cover rounded-xl border border-zinc-200" />
                ))}
              </div>
            </div>
          )}

          {/* Link to AI report */}
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">AI Report</p>
            <a
              href={`/report/${sub.show_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-700 underline hover:text-zinc-950"
            >
              Open report &rarr;
            </a>
            <p className="text-xs text-zinc-400 mt-0.5">Note: opens the published view once review is live.</p>
          </div>

          {/* Comments */}
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">Messages</p>
            {comments.length === 0 && <p className="text-xs text-zinc-400 mb-2">No messages yet.</p>}
            {comments.length > 0 && (
              <div className="space-y-2 mb-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl px-3 py-2 text-sm ${c.is_gem_team ? "bg-zinc-950 text-white ml-6" : "bg-zinc-100 text-zinc-700 mr-6"}`}
                  >
                    <p className="text-[10px] font-semibold opacity-50 mb-0.5">
                      {c.is_gem_team ? "GEM" : c.author_name} &middot; {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p>{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Reply to writer..."
                className="gem-input flex-1 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
              />
              <button
                onClick={sendReply}
                disabled={!replyBody.trim() || sendingReply}
                className="gem-btn-primary text-sm px-3 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          {/* Admin notes + publish */}
          {isPending && (
            <div className="border-t border-zinc-100 pt-5 space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-2">
                  Private Notes (not shown to writer)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal thoughts, comp notes, triage signal..."
                  rows={3}
                  className="gem-input resize-none text-sm w-full"
                />
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="gem-btn-primary w-full disabled:opacity-50"
              >
                {publishing ? "Publishing..." : "Publish Review → Writer Can See It Now"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<GEMSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    fetch("/api/submissions")
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return; }
        if (!res.ok) return;
        const { submissions: s } = await res.json();
        setSubmissions(s || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePublish = async (showId: string, notes: string) => {
    const res = await fetch(`/api/submissions/${showId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published", admin_notes: notes }),
    });
    if (res.ok) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.show_id === showId
            ? { ...s, status: "published", admin_notes: notes }
            : s
        )
      );
    }
  };

  const visible = filter === "pending"
    ? submissions.filter((s) => s.status === "pending_review")
    : submissions;

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  );

  if (forbidden) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
      <p className="text-zinc-500 text-sm">Access restricted.</p>
      <button onClick={() => router.push("/")} className="gem-btn-secondary text-sm">Back to home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="py-12">
        <div className="gem-container max-w-3xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1">GEM Admin</p>
              <h1 className="text-3xl font-semibold text-zinc-950">Submission Queue</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {pendingCount} pending review &middot; {submissions.length} total
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {(["pending", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-zinc-950 text-white"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {f === "pending" ? `Pending (${pendingCount})` : `All (${submissions.length})`}
              </button>
            ))}
          </div>

          {/* Submission list */}
          {visible.length === 0 ? (
            <div className="text-center py-16 text-sm text-zinc-400">
              {filter === "pending" ? "No pending submissions." : "No submissions yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((sub) => (
                <SubmissionCard key={sub.id} sub={sub} onPublish={handlePublish} />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
