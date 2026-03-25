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

    // Listen for auth state changes
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
    <nav className="border-b border-gem-border bg-gem-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="gem-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gem-gold/10 border border-gem-gold/30 flex items-center justify-center">
            <span className="font-display font-bold text-gem-gold text-sm">G</span>
          </div>
          <span className="font-display font-semibold text-lg text-gem-text-primary tracking-tight">
            GEM
          </span>
        </Link>

        {/* Nav links */}
        {isLoggedIn ? (
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm transition-colors ${
                pathname === "/dashboard"
                  ? "text-gem-gold"
                  : "text-gem-text-secondary hover:text-gem-text-primary"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              className={`text-sm transition-colors ${
                pathname === "/upload"
                  ? "text-gem-gold"
                  : "text-gem-text-secondary hover:text-gem-text-primary"
              }`}
            >
              Upload
            </Link>
            <Link
              href="/billing"
              className={`text-sm transition-colors ${
                pathname === "/billing"
                  ? "text-gem-gold"
                  : "text-gem-text-secondary hover:text-gem-text-primary"
              }`}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gem-text-muted hover:text-gem-text-secondary transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-gem-text-secondary hover:text-gem-text-primary transition-colors"
            >
              Log In
            </Link>
            <Link href="/auth/signup" className="gem-btn-primary text-sm !py-2 !px-4">
              Start Free Trial
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
