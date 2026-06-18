"use client";

import { registerAction } from "../actions";
import { useState } from "react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    const result = await registerAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-xl font-medium">Account aanmaken</h1>
      <p className="mb-4 text-sm text-ink-soft">
        Maak een nieuw gebruikersaccount aan voor deze urenlijst.
      </p>
      <form action={handleAction} className="flex flex-col gap-3">
        <label className="text-sm">
          Naam
          <input
            name="name"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-md border border-surface-line p-2"
          />
        </label>
        <label className="text-sm">
          Gebruikersnaam
          <input
            name="username"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-surface-line p-2"
          />
        </label>
        <label className="text-sm">
          Wachtwoord
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-surface-line p-2"
          />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">
          Account aanmaken
        </button>
      </form>
      <a href="/login" className="mt-4 inline-block text-sm text-accent">
        Al een account? Inloggen
      </a>
    </div>
  );
}
