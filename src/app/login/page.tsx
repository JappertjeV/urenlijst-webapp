"use client";

import { loginAction } from "../actions";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    const result = await loginAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-medium">Inloggen</h1>
      <form action={handleAction} className="flex flex-col gap-3">
        <label className="text-sm">Gebruikersnaam
          <input name="username" required
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="text-sm">Wachtwoord
          <input name="password" type="password" required
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Inloggen</button>
      </form>
    </div>
  );
}
