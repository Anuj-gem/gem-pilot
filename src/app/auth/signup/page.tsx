"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (authError) throw authError;

      // Email confirmation is disabled — user gets a session immediately
      if (data.user && !data.session) {
        setError("Check your email for a confirmation link, then sign in.");
        setLoading(false);
        return;
      }

      // Go straight to the upload page — let them use their 2 free evals
      router.push("/upload");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold mb-2">
              Start evaluating scripts
            </h1>
            <p className="text-sm text-gem-text-secondary">
              2 free evaluations included. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="text-sm text-gem-danger bg-gem-danger/10 border border-gem-danger/20 rounded px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="gem-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="gem-input"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="gem-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gem-input"
                placeholder="you@production.com"
                required
              />
            </div>

            <div>
              <label className="gem-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gem-input"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="gem-btn-primary w-full">
              {loading ? "Creating account..." : "Create Free Account"}
            </button>

            <p className="text-xs text-gem-text-muted text-center">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-sm text-gem-text-muted text-center mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-gem-gold hover:text-gem-gold-light">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
