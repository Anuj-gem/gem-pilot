"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // TODO: Replace with real Supabase auth
      // const { error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;

      // Mock: simulate login
      await new Promise((r) => setTimeout(r, 800));
      if (!email || !password) {
        throw new Error("Please enter your email and password.");
      }
      localStorage.setItem("gem_user", JSON.stringify({ email, name: email.split("@")[0] }));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
    </div>
  );
}
