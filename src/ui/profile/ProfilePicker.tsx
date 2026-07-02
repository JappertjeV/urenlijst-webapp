"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Profile } from "@/types";

// Zonder login: kies wiens uren je bekijkt. De keuze reist mee als
// ?profile=<id> zodat elke pagina hem server-side kan oplossen.
export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("profile") ?? profiles[0]?.id ?? "";

  if (profiles.length === 0) return null;

  return (
    <select
      aria-label="Profiel bekijken"
      className="field w-auto py-1.5 text-[15px]"
      value={active}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        params.set("profile", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
