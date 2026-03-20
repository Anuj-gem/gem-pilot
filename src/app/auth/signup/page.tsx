"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

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
      // TODO: Replace with real Supabase auth
      // const { error } = await supabase.auth.signUp({
      //   email, password,
      //   options: { data: { name } }
      // });
      // if (error) throw error;

      // Mock: simulate signup
      await new Promise((r) => setTimeout(r, 800));
      if (!email || !password) {
        throw new Error("Please fill in all fields.");
      }
      localStorage.setItem("gem_user", JSON.stringify({ email, name }));
      router.push("/dashboard");
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
            <h1 className="font-display text-2xl font-bold mb-2">Start your free trial</h1>
            <p className="text-sm text-gem-text-secondary">
              7 days free &middot; $99/month after &middot; Cancel anytime
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
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-xs text-gem-text-muted text-center">
              By signing up you agree to our Terms of Service and Privacy Policy.
              Your trial includes unlimited script analyses under our fair use policy.
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
