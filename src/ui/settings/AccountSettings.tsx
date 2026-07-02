"use client";

import { useActionState, useRef } from "react";
import { changePasswordAction, logoutAction } from "@/app/actions";

export function AccountSettings({
  name,
  username,
}: {
  name: string;
  username: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof changePasswordAction>> | null, formData: FormData) => {
      const result = await changePasswordAction(prev, formData);
      if ("ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="card flex items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{name}</span>
          <span className="block text-sm text-ink-soft">@{username}</span>
        </span>
        <form action={logoutAction}>
          <button className="btn-danger px-3 py-1.5 text-[14px]">Uitloggen</button>
        </form>
      </div>

      <form ref={formRef} action={action} className="card flex flex-col gap-4 px-4 py-4">
        <p className="text-[15px] font-semibold">Wachtwoord wijzigen</p>
        <div>
          <label className="label" htmlFor="current-password">Huidig wachtwoord</label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            className="field"
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="new-password">
            Nieuw wachtwoord (minimaal 6 tekens)
          </label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            className="field"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        {state && "error" in state && <p className="form-error">{state.error}</p>}
        {state && "ok" in state && (
          <p className="rounded-(--radius-control) bg-accent-soft px-3 py-2.5 text-[15px] text-accent">
            Wachtwoord gewijzigd.
          </p>
        )}
        <button type="submit" className="btn-primary self-start" disabled={pending}>
          {pending ? "Opslaan…" : "Wachtwoord opslaan"}
        </button>
      </form>
    </div>
  );
}
