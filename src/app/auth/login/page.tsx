"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-sm text-gem-text-secondary">
            Sign in to your GEM account
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="text-sm text-gem-danger bg-gem-danger/10 border border-gem-danger/20 rounded px-4 py-3">
              {error}
            </div>
          )}

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
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="gem-btn-primary w-full">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-gem-text-muted text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-gem-gold hover:text-gem-gold-light">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-16" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
