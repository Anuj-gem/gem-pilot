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

      // Go straight to the upload page
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

      <div className="flex-1 flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-zinc-950 mb-2">
              Submit your script to GEM
            </h1>
            <p className="text-sm text-zinc-500">
              Get detailed feedback on your writing — completely free.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
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
                placeholder="you@email.com"
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

            <p className="text-xs text-zinc-400 text-center">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-sm text-zinc-500 text-center mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-emerald-700 font-medium hover:text-emerald-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
