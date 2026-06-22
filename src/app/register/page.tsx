"use client";

import { registerAction } from "../actions";
import { useState } from "react";

const fieldCls =
  "mt-1 w-full rounded-xl border border-surface-line bg-surface px-3 py-2.5 text-base";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    const result = await registerAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-[28px] font-bold leading-tight">Account aanmaken</h1>
        <p className="mb-6 text-sm text-ink-soft">Maak een nieuw gebruikersaccount aan.</p>
        <form action={handleAction} className="flex flex-col gap-4">
          <label className="text-sm text-ink-soft">Naam
            <input name="name" required autoComplete="name" className={fieldCls} /></label>
          <label className="text-sm text-ink-soft">Gebruikersnaam
            <input name="username" required autoComplete="username" autoCapitalize="none" autoCorrect="off"
              className={fieldCls} /></label>
          <label className="text-sm text-ink-soft">Wachtwoord
            <input name="password" type="password" required minLength={6} autoComplete="new-password"
              className={fieldCls} /></label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="w-full rounded-xl bg-accent py-3 text-base font-medium text-white active:opacity-80">
            Account aanmaken
          </button>
        </form>
        <a href="/login" className="mt-5 inline-block text-sm text-accent">
          Al een account? Inloggen
        </a>
      </div>
    </div>
  );
}
