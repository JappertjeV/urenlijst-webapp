"use client";

import type { Profile } from "@/types";

export function ProfilePicker({
  profiles, activeId,
}: {
  profiles: Profile[];
  activeId: string;
}) {
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <span className="text-ink-soft">Profiel</span>
      <select name="profile" defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-surface-line p-1.5">
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </form>
  );
}
