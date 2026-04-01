"use client";

import { useState } from "react";

interface PaywallModalProps {
  onClose: () => void;
}

export function PaywallModal({ onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[var(--gem-gray-800)] rounded-2xl border border-[var(--gem-gray-700)] p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--gem-gray-400)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-white mb-2">
          Your free evaluation has been used
        </h2>
        <p className="text-sm text-[var(--gem-gray-400)] mb-6">
          Subscribe to keep evaluating — unlimited scripts, full reports, results in under a minute.
        </p>

        <div className="rounded-xl border border-[var(--gem-gray-600)] bg-[var(--gem-gray-900)] px-6 py-5 mb-6">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-white">$20</span>
            <span className="text-sm text-[var(--gem-gray-400)]">/ month</span>
          </div>
          <ul className="space-y-2 mt-3">
            {[
              "Unlimited script evaluations",
              "5-dimension scoring with weighted GEM score",
              "Full development notes + production analysis",
              "Public profile on the Discover leaderboard",
              "Cancel anytime",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-[var(--gem-gray-300)]"
              >
                <span className="text-emerald-400 text-xs">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/30 border border-red-800 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? "Redirecting to checkout..." : "Subscribe — $20 / mo"}
        </button>

        <p className="text-xs text-[var(--gem-gray-500)] text-center mt-3">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
