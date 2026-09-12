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
  const onCockpit = pathname === "/cockpit" || pathname.startsWith("/cockpit/");

  return (
    <header
      data-testid="top-nav"
      data-unified-header={onCockpit ? "1" : undefined}
      className={cn(
        "sticky top-0 z-50 bg-void/90 backdrop-blur-md",
        onCockpit
          ? "unified-hud-rail border-b-0 shadow-none"
          : "border-b border-hud-border",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex max-w-[1600px] items-center justify-between px-4 md:px-6",
          onCockpit ? "py-1.5" : "py-3",
        )}
      >
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
                    "cursor-pointer rounded-md px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors duration-200",
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
