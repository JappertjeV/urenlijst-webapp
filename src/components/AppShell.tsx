"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { EntryForm } from "./EntryForm";
import { logoutAction } from "@/app/actions";
import type { LocationDTO } from "@/types";

type IconName = "vandaag" | "kalender" | "overzicht" | "instellingen" | "plus";

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "vandaag":
      return <svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case "kalender":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case "overzicht":
      return <svg {...p}><path d="M4 20V10M12 20V4M20 20v-8M2 20h20" /></svg>;
    case "instellingen":
      return <svg {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
  }
}

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Vandaag", icon: "vandaag" },
  { href: "/kalender", label: "Kalender", icon: "kalender" },
  { href: "/overzicht", label: "Overzicht", icon: "overzicht" },
  { href: "/instellingen", label: "Instellingen", icon: "instellingen" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function AppShell({
  canEdit,
  userName,
  locations,
  children,
}: {
  canEdit: boolean;
  userName: string | null;
  locations: LocationDTO[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="with-bottom-nav">
      {/* desktop top bar */}
      <header className="mb-6 hidden items-center justify-between gap-3 sm:flex">
        <Link href="/" className="text-lg font-medium">Urenlijst</Link>
        <nav className="flex items-center gap-1 text-sm">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href}
              className={isActive(pathname, t.href) ? "rounded-full bg-surface-soft px-3 py-1.5" : "rounded-full px-3 py-1.5 text-ink-soft"}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {canEdit ? (
            <>
              <span className="text-ink-soft">{userName}</span>
              <form action={logoutAction}><button className="text-ink-soft">Uitloggen</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-accent">Inloggen</Link>
              <Link href="/register" className="text-accent">Account</Link>
            </>
          )}
        </div>
      </header>

      {/* mobile top account row */}
      <div className="mb-1 flex items-center justify-end text-sm sm:hidden">
        {canEdit ? (
          <form action={logoutAction}><button className="-mr-1 px-2 py-1 text-ink-soft">Uitloggen</button></form>
        ) : (
          <Link href="/login" className="-mr-1 px-2 py-1 text-accent">Inloggen</Link>
        )}
      </div>

      {children}

      {/* mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-surface-line bg-surface/85 backdrop-blur sm:hidden">
        <div className="flex">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} aria-label={t.label}
                className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 ${on ? "text-accent" : "text-ink-faint"}`}>
                <Icon name={t.icon} />
                <span className="text-[11px]">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* floating add button */}
      {canEdit && (
        <button onClick={() => setAdding(true)} aria-label="Uren toevoegen"
          className="fab-pos z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg active:scale-95">
          <Icon name="plus" size={26} />
        </button>
      )}

      {/* quick-add: bottom sheet on mobile, centered dialog on desktop */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Uren toevoegen">
          <div className="pb-safe max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-surface-line bg-surface p-4 shadow-lg sm:max-h-[85svh] sm:rounded-card"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Uren toevoegen</h2>
              <button onClick={() => setAdding(false)} className="px-2 py-1 text-sm text-accent">Klaar</button>
            </div>
            <EntryForm date={today} locations={locations} onDone={() => setAdding(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
