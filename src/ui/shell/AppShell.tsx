"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions";
import { dayKey } from "@/domain/dates";
import { EntryForm } from "@/ui/entries/EntryForm";
import { ProfilePicker } from "@/ui/profile/ProfilePicker";
import { Sheet } from "@/ui/shell/Sheet";
import { Icon, type IconName } from "@/ui/icons";
import type { LocationDTO, Profile } from "@/types";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Vandaag", icon: "vandaag" },
  { href: "/kalender", label: "Kalender", icon: "kalender" },
  { href: "/overzicht", label: "Overzicht", icon: "overzicht" },
  { href: "/instellingen", label: "Instellingen", icon: "instellingen" },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

// Eén schil, twee gezichten: vaste zijbalk op desktop (≥ 1024px), frosted
// onderbalk + zwevende +knop op mobiel/tablet. De inhoud wordt één keer
// gerenderd; alleen de chroom wisselt per breakpoint.
export function AppShell({
  canEdit,
  userName,
  locations,
  profiles,
  children,
}: {
  canEdit: boolean;
  userName: string | null;
  locations: LocationDTO[];
  profiles: Profile[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adding, setAdding] = useState(false);

  // Zonder login reist het gekozen profiel mee in de navigatie.
  const profileQuery =
    !canEdit && searchParams.get("profile")
      ? { profile: searchParams.get("profile")! }
      : undefined;

  // Het urenformulier opent standaard op de dag die de gebruiker bekijkt.
  const viewedDate = searchParams.get("datum") ?? dayKey(new Date());

  const navLink = (href: string) => ({ pathname: href, query: profileQuery });

  return (
    <div className="min-h-svh">
      {/* ---- desktop: vaste zijbalk ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href={navLink("/")} className="mb-8 flex items-center gap-3 px-2">
          <Image src="/icon.svg" alt="" width={34} height={34} className="rounded-[10px]" />
          <span className="text-lg font-bold tracking-tight">Urenlijst</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={navLink(t.href)}
                className={`flex items-center gap-3 rounded-(--radius-control) px-3 py-2.5 text-[15px] transition-colors ${
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-soft hover:bg-canvas"
                }`}
              >
                <Icon name={t.icon} size={20} />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {canEdit && (
          <button onClick={() => setAdding(true)} className="btn-primary mt-6">
            <Icon name="plus" size={18} /> Uren toevoegen
          </button>
        )}

        <div className="mt-auto border-t border-line pt-4">
          {canEdit ? (
            <div className="flex items-center gap-3 px-1 text-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
                {(userName ?? "?").slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{userName}</span>
              <form action={logoutAction}>
                <button className="text-ink-faint transition-colors hover:text-ink">
                  Uitloggen
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-1 text-sm">
              <ProfilePicker profiles={profiles} />
              <div className="flex gap-4">
                <Link href="/login" className="font-medium text-accent">
                  Inloggen
                </Link>
                <Link href="/register" className="text-ink-soft">
                  Account aanmaken
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ---- inhoud (één keer gerenderd) ---- */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[calc(92px+env(safe-area-inset-bottom))] lg:max-w-5xl lg:px-12 lg:pt-10 lg:pb-16">
          {/* mobiele kopregel */}
          <div className="mb-3 flex min-h-8 items-center justify-between gap-3 lg:hidden">
            {!canEdit ? (
              <>
                <ProfilePicker profiles={profiles} />
                <Link href="/login" className="text-[15px] font-medium text-accent">
                  Inloggen
                </Link>
              </>
            ) : (
              <span />
            )}
          </div>
          {children}
        </div>
      </main>

      {/* ---- mobiel: frosted onderbalk ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/80 pb-safe backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={navLink(t.href)}
                aria-label={t.label}
                className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 py-1.5 transition-opacity active:opacity-60 ${
                  active ? "text-accent" : "text-ink-faint"
                }`}
              >
                <Icon name={t.icon} />
                <span className="text-[11px]">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ---- mobiel: zwevende +knop ---- */}
      {canEdit && (
        <button
          onClick={() => setAdding(true)}
          aria-label="Uren toevoegen"
          className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-(--shadow-float) transition active:scale-95 lg:hidden"
        >
          <Icon name="plus" size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* ---- uren toevoegen: bottom sheet / dialoog ---- */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Uren toevoegen">
        <EntryForm
          defaultDate={viewedDate}
          locations={locations}
          onDone={() => setAdding(false)}
        />
      </Sheet>
    </div>
  );
}
