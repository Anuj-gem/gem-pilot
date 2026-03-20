"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function BillingPage() {
  const [plan] = useState({
    status: "trialing" as const,
    trialEnds: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 99,
    interval: "month",
  });

  const statusLabels: Record<string, { label: string; color: string }> = {
    trialing: { label: "Free Trial", color: "text-gem-gold" },
    active: { label: "Active", color: "text-gem-pass" },
    canceled: { label: "Canceled", color: "text-gem-text-muted" },
    past_due: { label: "Past Due", color: "text-gem-danger" },
    none: { label: "No Plan", color: "text-gem-text-muted" },
  };

  const status = statusLabels[plan.status];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn />

      <main className="flex-1 py-12">
        <div className="gem-container max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-8">Settings & Billing</h1>

          {/* Subscription */}
          <div className="gem-card p-8 mb-6">
            <h2 className="font-display text-xl font-semibold mb-6">Subscription</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gem-text-secondary">Plan</span>
                <span className="text-sm font-medium text-gem-text-primary">
                  GEM Pro &mdash; ${plan.amount}/{plan.interval}
                </span>
              </div>

              <div className="gem-divider" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gem-text-secondary">Status</span>
                <span className={`text-sm font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {plan.status === "trialing" && (
                <>
                  <div className="gem-divider" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gem-text-secondary">Trial ends</span>
                    <span className="text-sm text-gem-text-primary">
                      {new Date(plan.trialEnds).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              )}

              <div className="gem-divider" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gem-text-secondary">Scripts analyzed</span>
                <span className="text-sm text-gem-text-primary">Unlimited</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  // TODO: Redirect to Stripe Customer Portal
                  alert("This will redirect to Stripe Customer Portal when connected.");
                }}
                className="gem-btn-secondary text-sm"
              >
                Manage Subscription
              </button>
              {plan.status === "trialing" && (
                <button
                  onClick={() => {
                    // TODO: Redirect to Stripe Checkout
                    alert("This will redirect to Stripe Checkout when connected.");
                  }}
                  className="gem-btn-primary text-sm"
                >
                  Add Payment Method
                </button>
              )}
            </div>
          </div>

          {/* Account */}
          <div className="gem-card p-8 mb-6">
            <h2 className="font-display text-xl font-semibold mb-6">Account</h2>

            <div className="space-y-4">
              <div>
                <label className="gem-label">Email</label>
                <input
                  type="email"
                  defaultValue="producer@example.com"
                  className="gem-input"
                  disabled
                />
              </div>
              <div>
                <label className="gem-label">Name</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Your name"
                  className="gem-input"
                />
              </div>
              <button className="gem-btn-secondary text-sm">Update Profile</button>
            </div>
          </div>

          {/* Fair Use */}
          <div className="gem-card p-8">
            <h2 className="font-display text-xl font-semibold mb-4">Fair Use Policy</h2>
            <p className="text-sm text-gem-text-secondary leading-relaxed">
              GEM is designed for professional script evaluation. Your subscription
              includes unlimited analyses for your personal production workflow.
              Automated bulk processing, reselling analysis results, or using GEM
              as a component in other services is not permitted under the standard
              plan. If you need higher-volume or enterprise access, contact us.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
