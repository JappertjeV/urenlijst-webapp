"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { registerAction } from "@/app/actions";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, null);
  const error = state && "error" in state ? state.error : null;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/icon.svg" alt="" width={56} height={56} className="rounded-2xl" />
          <h1 className="text-xl font-bold">Account aanmaken</h1>
        </div>
        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="name">Naam</label>
            <input id="name" name="name" className="field" autoComplete="name" required />
          </div>
          <div>
            <label className="label" htmlFor="username">Gebruikersnaam</label>
            <input
              id="username"
              name="username"
              className="field"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Wachtwoord (minimaal 6 tekens)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Aanmaken…" : "Account aanmaken"}
          </button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-center text-sm">
          <p className="text-ink-soft">
            Al een account?{" "}
            <Link href="/login" className="font-medium text-accent">
              Inloggen
            </Link>
          </p>
          <Link href="/" className="text-ink-faint">
            ← Terug naar de uren
          </Link>
        </div>
      </div>
    </div>
  );
}
