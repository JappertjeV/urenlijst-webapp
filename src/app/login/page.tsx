"use client";

import { loginAction } from "../actions";
import { useState } from "react";

const fieldCls =
  "mt-1 w-full rounded-xl border border-surface-line bg-surface px-3 py-2.5 text-base";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    const result = await loginAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="mb-6 text-[28px] font-bold leading-tight">Inloggen</h1>
      <form action={handleAction} className="flex flex-col gap-4">
        <label className="text-sm text-ink-soft">Gebruikersnaam
          <input name="username" required autoComplete="username" autoCapitalize="none" autoCorrect="off"
            className={fieldCls} /></label>
        <label className="text-sm text-ink-soft">Wachtwoord
          <input name="password" type="password" required autoComplete="current-password"
            className={fieldCls} /></label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full rounded-xl bg-accent py-3 text-base font-medium text-white active:opacity-80">Inloggen</button>
      </form>
      <a href="/register" className="mt-5 inline-block text-sm text-accent">
        Nog geen account? Account aanmaken
      </a>
    </div>
  );
}
