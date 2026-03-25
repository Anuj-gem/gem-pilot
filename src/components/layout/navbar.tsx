"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="gem-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center">
            <span className="font-bold text-white text-sm">G</span>
          </div>
          <span className="font-semibold text-lg text-zinc-950 tracking-tight">
            GEM
          </span>
        </Link>

        {/* Nav links */}
        {isLoggedIn ? (
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              className={`text-sm font-medium transition-colors ${
                pathname === "/upload"
                  ? "text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Upload
            </Link>
            <Link
              href="/billing"
              className={`text-sm font-medium transition-colors ${
                pathname === "/billing"
                  ? "text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Try Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
