"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type Phase = "upload" | "processing" | "done";

const PROCESSING_STEPS = [
  "Uploading script...",
  "Extracting text from PDF...",
  "Scoring across 10 dimensions...",
  "Computing percentile rank...",
  "Generating producer report...",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scriptTitle, setScriptTitle] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState("");

  const handleFile = useCallback((file: File) => {
    setError("");
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (![".pdf", ".txt", ".md", ".fountain"].includes(ext)) {
      setError("Unsupported file type. Upload a PDF or text file.");
      return;
    }

    setSelectedFile(file);
    // Pre-populate title from filename (cleaned up)
    const baseName = file.name.replace(/\.[^.]+$/, ""); // strip extension
    const pretty = baseName
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    setScriptTitle(pretty);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const startAnalysis = async () => {
    if (!selectedFile) return;
    setPhase("processing");
    setProcessingStep(0);

    // Derive show_id from the title the producer entered
    const showId = slugify(scriptTitle || selectedFile.name.replace(/\.[^.]+$/, ""));

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setProcessingStep(0);
      const res = await fetch(`/api/evaluate?show_id=${encodeURIComponent(showId)}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const { job_id, show_id } = await res.json();
      setProcessingStep(1);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 300;
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;

        const statusRes = await fetch(`/api/jobs/${job_id}`);
        if (!statusRes.ok) continue;

        const jobData = await statusRes.json();

        if (jobData.status === "processing") {
          const elapsed = attempts;
          if (elapsed > 3) setProcessingStep(2);
          if (elapsed > 8) setProcessingStep(3);
          if (elapsed > 15) setProcessingStep(4);
        }

        if (jobData.status === "completed") {
          setPhase("done");
          router.push(`/report/${show_id}`);
          return;
        }

        if (jobData.status === "failed") {
          // Log the raw error for debugging but never surface internal details to the user
          console.error("[GEM] Job failed:", jobData.error);
          throw new Error("Analysis failed. Please try again.");
        }
      }

      throw new Error("Analysis timed out. Please try again.");
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
      setPhase("upload");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="w-full max-w-lg gem-container">
          {phase === "upload" && (
            <div className="animate-fade-in">
              <h1 className="font-display text-3xl font-bold text-center mb-2">
                Upload a script
              </h1>
              <p className="text-sm text-gem-text-secondary text-center mb-8">
                Drop a pilot script and we&apos;ll evaluate its breakout potential
                across 10 dimensions — verdict in 30–90 seconds.
              </p>

              {error && (
                <div className="text-sm text-gem-danger bg-gem-danger/10 border border-gem-danger/20 rounded px-4 py-3 mb-4">
                  <p className="font-semibold mb-1">Analysis failed</p>
                  <p>{error}</p>
                  {error.toLowerCase().includes("rate limit") && (
                    <p className="mt-2 text-gem-text-muted">
                      Add billing credits at{" "}
                      <a
                        href="https://platform.openai.com/settings/billing"
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-gem-gold"
                      >
                        platform.openai.com/settings/billing
                      </a>{" "}
                      then try again.
                    </p>
                  )}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  gem-card p-12 text-center cursor-pointer transition-all duration-200
                  ${
                    dragActive
                      ? "border-gem-gold bg-gem-gold/5"
                      : selectedFile
                        ? "border-gem-gold/30"
                        : "border-dashed hover:border-gem-text-muted"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.fountain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-gem-gold/10 border border-gem-gold/20 flex items-center justify-center mx-auto">
                      <span className="text-gem-gold text-lg">&#128196;</span>
                    </div>
                    <p className="font-medium text-gem-text-primary">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gem-text-muted">
                      {(selectedFile.size / 1024).toFixed(0)} KB &middot; Click
                      to choose a different file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-gem-surface border border-gem-border flex items-center justify-center mx-auto">
                      <span className="text-gem-text-muted text-lg">
                        &#8593;
                      </span>
                    </div>
                    <p className="text-sm text-gem-text-secondary">
                      Drag and drop your script, or click to browse
                    </p>
                    <p className="text-xs text-gem-text-muted">
                      PDF or TXT &middot; Scanned PDFs supported via OCR
                    </p>
                  </div>
                )}
              </div>

              {/* Script title input — shown once a file is selected */}
              {selectedFile && (
                <div className="mt-4">
                  <label className="gem-label" htmlFor="script-title">
                    Script title
                  </label>
                  <input
                    id="script-title"
                    type="text"
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="e.g. The Sopranos"
                    className="gem-input"
                  />
                  <p className="text-xs text-gem-text-muted mt-1.5">
                    Used as the report title — edit if the filename isn&apos;t the show name.
                  </p>
                </div>
              )}

              <button
                onClick={startAnalysis}
                disabled={!selectedFile || !scriptTitle.trim()}
                className="gem-btn-primary w-full mt-6"
              >
                Analyze Script
              </button>

              {/* What the producer will get */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Verdict", desc: "Strong Signal → Pass tier" },
                  { label: "10 dimensions", desc: "Scored vs. winner avg" },
                  { label: "Producer read", desc: "Takeaway + key risks" },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="rounded border border-gem-border bg-gem-surface-raised px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-gem-text-primary mb-0.5">
                      {label}
                    </p>
                    <p className="text-[11px] text-gem-text-muted leading-snug">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div className="text-center animate-fade-in">
              <div className="mb-8">
                <LoadingSpinner size={48} />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">
                Analyzing your script
              </h2>
              <p className="text-sm text-gem-text-secondary mb-8">
                This typically takes 30&ndash;90 seconds. Scanned PDFs may take
                longer.
              </p>

              <div className="space-y-3 text-left max-w-sm mx-auto">
                {PROCESSING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      i < processingStep
                        ? "text-gem-gold"
                        : i === processingStep
                          ? "text-gem-text-primary"
                          : "text-gem-text-muted"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {i < processingStep
                        ? "✓"
                        : i === processingStep
                          ? "●"
                          : "○"}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
