"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type Phase = "upload" | "processing" | "done";

const PROCESSING_STEPS = [
  "Uploading your script...",
  "Extracting text from PDF...",
  "Scoring across 10 dimensions...",
  "Comparing against benchmark shows...",
  "Generating your feedback report...",
];

const MAX_IMAGES = 5;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ImagePreview {
  file: File;
  url: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scriptTitle, setScriptTitle] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [imdbUrl, setImdbUrl] = useState("");
  const [conceptImages, setConceptImages] = useState<ImagePreview[]>([]);
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
    const baseName = file.name.replace(/\.[^.]+$/, "");
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

  const handleImages = useCallback((files: FileList) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxImageSize = 10 * 1024 * 1024; // 10MB per image
    const newImages: ImagePreview[] = [];

    Array.from(files).forEach((file) => {
      if (!allowed.includes(file.type)) return;
      if (file.size > maxImageSize) return;
      newImages.push({ file, url: URL.createObjectURL(file) });
    });

    setConceptImages((prev) => {
      const combined = [...prev, ...newImages];
      return combined.slice(0, MAX_IMAGES);
    });
  }, []);

  const removeImage = (index: number) => {
    setConceptImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;
    setPhase("processing");
    setProcessingStep(0);

    const showId = slugify(scriptTitle || selectedFile.name.replace(/\.[^.]+$/, ""));

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (imdbUrl.trim()) formData.append("imdb_url", imdbUrl.trim());
      conceptImages.forEach((img, i) => {
        formData.append(`concept_image_${i}`, img.file);
      });

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
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-lg">
          {phase === "upload" && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-semibold text-zinc-950 text-center mb-2">
                Submit your script
              </h1>
              <p className="text-sm text-zinc-500 text-center mb-2">
                Submit your pilot script. You&apos;ll get a personalized review within 24 hours — completely free.
              </p>
              <p className="text-xs text-zinc-400 text-center mb-8">
                GEM is calibrated for <span className="font-medium text-zinc-500">TV pilots and series scripts</span>. Feature film scripts are not currently supported.
              </p>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                  <p className="font-semibold mb-1">Something went wrong</p>
                  <p>{error}</p>
                  {error.toLowerCase().includes("rate limit") && (
                    <p className="mt-2 text-zinc-500">
                      We&apos;re experiencing high demand. Please try again in a few minutes.
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
                  rounded-2xl border-2 p-12 text-center cursor-pointer transition-all duration-200 bg-white
                  ${
                    dragActive
                      ? "border-zinc-950 bg-zinc-50"
                      : selectedFile
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
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
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                      <span className="text-emerald-600 text-lg">&#128196;</span>
                    </div>
                    <p className="font-medium text-zinc-950">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / 1024).toFixed(0)} KB &middot; Click
                      to choose a different file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto">
                      <span className="text-zinc-400 text-lg">&#8593;</span>
                    </div>
                    <p className="text-sm text-zinc-600">
                      Drag and drop your script, or click to browse
                    </p>
                    <p className="text-xs text-zinc-400">
                      PDF or TXT &middot; Scanned PDFs supported via OCR
                    </p>
                  </div>
                )}
              </div>

              {/* Additional fields — shown once a file is selected */}
              {selectedFile && (
                <>
                  {/* Script title */}
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
                    <p className="text-xs text-zinc-400 mt-1.5">
                      This will be the title on your feedback report.
                    </p>
                  </div>

                  {/* Concept images */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="gem-label mb-0">
                        Visual concepts <span className="text-zinc-400 font-normal">(optional)</span>
                      </label>
                      {conceptImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                        >
                          + Add images
                        </button>
                      )}
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) handleImages(e.target.files);
                      }}
                    />

                    {conceptImages.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 transition-all duration-200 p-6 text-center"
                      >
                        <p className="text-sm text-zinc-500">
                          Used AI to visualize your world? Add concept images, character renders, or mood boards.
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Up to {MAX_IMAGES} images &middot; JPG, PNG, or WebP
                        </p>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-2">
                          {conceptImages.map((img, i) => (
                            <div key={i} className="relative group aspect-square">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={`Concept ${i + 1}`}
                                className="w-full h-full object-cover rounded-xl border border-zinc-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                &#x2715;
                              </button>
                            </div>
                          ))}
                          {conceptImages.length < MAX_IMAGES && (
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 bg-white hover:border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all"
                            >
                              <span className="text-xl leading-none">+</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {conceptImages.length} of {MAX_IMAGES} images &middot; Hover to remove
                        </p>
                      </div>
                    )}
                  </div>

                  {/* IMDb */}
                  <div className="mt-4">
                    <label className="gem-label" htmlFor="imdb-url">
                      IMDb profile <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="imdb-url"
                      type="url"
                      value={imdbUrl}
                      onChange={(e) => setImdbUrl(e.target.value)}
                      placeholder="https://www.imdb.com/name/..."
                      className="gem-input"
                    />
                    <p className="text-xs text-zinc-400 mt-1.5">
                      Link us to your credits if you have them. Not required — great writing speaks for itself.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={startAnalysis}
                disabled={!selectedFile || !scriptTitle.trim()}
                className="gem-btn-primary w-full mt-6"
              >
                Submit for Feedback
              </button>

              {/* What the writer will get */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Full report", desc: "Strengths + areas to develop" },
                  { label: "10 dimensions", desc: "Scored against top shows" },
                  { label: "Next steps", desc: "Clear guidance on what to focus on" },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-zinc-950 mb-0.5">
                      {label}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-snug">
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
              <h2 className="text-2xl font-semibold text-zinc-950 mb-2">
                Reading your script
              </h2>
              <p className="text-sm text-zinc-500 mb-8">
                Uploading your script now. Your review will be delivered within 24 hours.
              </p>

              <div className="space-y-3 text-left max-w-sm mx-auto">
                {PROCESSING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      i < processingStep
                        ? "text-emerald-600"
                        : i === processingStep
                          ? "text-zinc-950"
                          : "text-zinc-300"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {i < processingStep
                        ? "\u2713"
                        : i === processingStep
                          ? "\u25CF"
                          : "\u25CB"}
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
