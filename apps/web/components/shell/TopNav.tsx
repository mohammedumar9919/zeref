"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/cockpit", label: "Cockpit" },
  { href: "/settings", label: "Settings" },
] as const;

export function TopNav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-50 border-b border-hud-border bg-void/90 backdrop-blur-md"
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6">
        <span className="font-mono text-xs uppercase tracking-[0.35em] text-hud-cyan/80">
          Zeref
        </span>
        <ul className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active =
              href === "/cockpit"
                ? pathname === "/cockpit" || pathname.startsWith("/cockpit/")
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={cn(
                    "rounded-md px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors",
                    active
                      ? "bg-hud-cyan/10 text-hud-cyan"
                      : "text-hud-muted hover:text-hud-primary",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
