"use client";

import { useRef, useState } from "react";
import { changePasswordAction } from "@/app/actions";

const inputClass = "mt-1 w-full rounded-md border border-surface-line p-2";

export function AccountSettings({ name, username }: { name: string; username: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await changePasswordAction(formData);
      if (res.ok) {
        setMessage("Wachtwoord gewijzigd.");
        formRef.current?.reset();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-surface-line bg-surface p-4">
      <h2 className="mb-1 text-lg font-medium">Account</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Ingelogd als <b>{name}</b> ({username}).
      </p>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {message && <div className="mb-3 text-sm text-green-700">{message}</div>}

      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm">Huidig wachtwoord
          <input name="currentPassword" type="password" required autoComplete="current-password"
            className={inputClass} /></label>
        <label className="text-sm">Nieuw wachtwoord
          <input name="newPassword" type="password" required minLength={6} autoComplete="new-password"
            className={inputClass} /></label>
        <button disabled={busy} className="self-start rounded-md bg-accent px-4 py-2 text-sm text-white">
          {busy ? "Opslaan…" : "Wachtwoord wijzigen"}
        </button>
      </form>
    </section>
  );
}
