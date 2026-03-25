"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase-client";

interface Profile {
  email: string;
  name: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
}

export default function BillingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("email, name, subscription_status, trial_ends_at")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    })();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gem-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="gem-container max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-8">Settings & Billing</h1>

          {/* Access */}
          <div className="gem-card p-8 mb-6">
            <h2 className="font-display text-xl font-semibold mb-6">Access</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gem-text-secondary">Status</span>
                <span className="text-sm font-medium text-gem-pass">Active</span>
              </div>

              <div className="gem-divider" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-gem-text-secondary">Scripts analyzed</span>
                <span className="text-sm text-gem-text-primary">Unlimited</span>
              </div>
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
                  defaultValue={profile?.email || ""}
                  className="gem-input"
                  disabled
                />
              </div>
              <div>
                <label className="gem-label">Name</label>
                <input
                  type="text"
                  defaultValue={profile?.name || ""}
                  placeholder="Your name"
                  className="gem-input"
                  disabled
                />
              </div>
              <button onClick={handleSignOut} className="gem-btn-secondary text-sm">
                Sign Out
              </button>
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
