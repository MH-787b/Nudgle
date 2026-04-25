"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Calendar, CreditCard, LayoutDashboard, Loader2, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden sm:block bg-surface-100 border-b border-surface-300">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-500" strokeWidth={2} />
              <span className="text-lg font-bold tracking-tight text-white">nudgle</span>
            </Link>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-surface-600 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4" strokeWidth={2} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 hover:text-white transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            ) : (
              <LogOut className="w-4 h-4" strokeWidth={2} />
            )}
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface-100 border-t border-surface-300 z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                pathname === item.href
                  ? "text-brand-500"
                  : "text-surface-500"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium text-surface-500 disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
            ) : (
              <LogOut className="w-5 h-5" strokeWidth={2} />
            )}
            {loggingOut ? "..." : "Log out"}
          </button>
        </div>
      </nav>
    </>
  );
}
