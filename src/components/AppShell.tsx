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
    <div>
      {/* ---- desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-surface-line bg-surface px-3 py-5 lg:flex">
        <Link href="/" className="px-3 pb-5 text-lg font-semibold">Urenlijst</Link>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  on ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-surface-soft"
                }`}>
                <Icon name={t.icon} size={20} />{t.label}
              </Link>
            );
          })}
        </nav>
        {canEdit && (
          <button onClick={() => setAdding(true)}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
            <Icon name="plus" size={18} /> Uren toevoegen
          </button>
        )}
        <div className="mt-auto flex items-center gap-3 border-t border-surface-line pt-3 text-sm">
          {canEdit ? (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs text-accent-ink">
                {(userName ?? "?").slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1 truncate">{userName}</span>
              <form action={logoutAction}><button className="text-ink-soft hover:text-ink">Uitloggen</button></form>
            </>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" className="text-accent">Inloggen</Link>
              <Link href="/register" className="text-accent">Account</Link>
            </div>
          )}
        </div>
      </aside>

      {/* ---- content (rendered once) ---- */}
      <main className="with-bottom-nav lg:ml-60">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3 lg:max-w-4xl lg:px-10 lg:py-10">
          <div className="mb-2 flex items-center justify-end text-sm lg:hidden">
            {canEdit ? (
              <form action={logoutAction}><button className="-mr-1 px-2 py-1 text-ink-soft">Uitloggen</button></form>
            ) : (
              <Link href="/login" className="-mr-1 px-2 py-1 text-accent">Inloggen</Link>
            )}
          </div>
          {children}
        </div>
      </main>

      {/* ---- mobile bottom tab bar ---- */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-surface-line bg-surface/85 backdrop-blur lg:hidden">
        <div className="flex">
          {TABS.map((t) => {
            const on = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} aria-label={t.label}
                className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 ${
                  on ? "text-accent" : "text-ink-faint"
                }`}>
                <Icon name={t.icon} />
                <span className="text-[11px]">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ---- mobile floating add button ---- */}
      {canEdit && (
        <button onClick={() => setAdding(true)} aria-label="Uren toevoegen"
          className="fab-pos z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg active:scale-95 lg:hidden">
          <Icon name="plus" size={26} />
        </button>
      )}

      {/* ---- quick-add: bottom sheet on mobile, centered dialog on desktop ---- */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Uren toevoegen">
          <div className="pb-safe max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-surface-line bg-surface p-4 shadow-lg sm:max-h-[85svh] sm:rounded-3xl"
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
