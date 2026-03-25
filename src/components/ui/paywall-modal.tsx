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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 transition-colors"
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

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-6">
          <span className="text-zinc-600 text-xl">✦</span>
        </div>

        <h2 className="text-2xl font-semibold text-zinc-950 mb-2">
          You&apos;ve used your free evaluations
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Your 2 free script evaluations are up. Subscribe to keep evaluating —
          unlimited scripts, results in minutes.
        </p>

        {/* Pricing */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-5 mb-6">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-semibold text-zinc-950">$49</span>
            <span className="text-sm text-zinc-400">/ month</span>
          </div>
          <ul className="space-y-2 mt-3">
            {[
              "Unlimited script evaluations",
              "10-dimension scoring vs. winner avg",
              "Full producer report every time",
              "Cancel anytime",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-zinc-600"
              >
                <span className="text-emerald-600 text-xs">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="gem-btn-primary w-full"
        >
          {loading ? "Redirecting to checkout..." : "Subscribe — $49 / mo"}
        </button>

        <p className="text-xs text-zinc-400 text-center mt-3">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
