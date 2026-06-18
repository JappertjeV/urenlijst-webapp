"use client";

import { useState } from "react";
import {
  connectICloudAction,
  listICloudCalendarsAction,
  selectICloudCalendarAction,
  disconnectICloudAction,
  uploadHoursAction,
} from "@/app/actions";
import type { CalendarOption, ICloudStatus } from "@/server/icloud";

const inputClass = "mt-1 w-full rounded-md border border-surface-line p-2";

export function IcloudSettings({ status }: { status: ICloudStatus }) {
  const [calendars, setCalendars] = useState<CalendarOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    setError(null);
    setMessage(null);
  }

  async function handleConnect(formData: FormData) {
    reset();
    setBusy(true);
    try {
      const res = await connectICloudAction(formData);
      if (res.ok) {
        setCalendars(res.calendars);
        setMessage("Verbonden. Kies hieronder een agenda.");
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadCalendars() {
    reset();
    setBusy(true);
    try {
      const res = await listICloudCalendarsAction();
      if (res.ok) setCalendars(res.calendars);
      else setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleSelect(formData: FormData) {
    reset();
    setBusy(true);
    try {
      const url = String(formData.get("calendarUrl"));
      const name = calendars?.find((c) => c.url === url)?.name ?? "Agenda";
      formData.set("calendarName", name);
      await selectICloudCalendarAction(formData);
      setCalendars(null);
      setMessage(`Agenda "${name}" opgeslagen.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    reset();
    setBusy(true);
    try {
      const res = await uploadHoursAction();
      if (res.ok) {
        setMessage(
          `${res.uploaded} uren geüpload naar iCloud${res.failed ? `, ${res.failed} mislukt` : ""}.`,
        );
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    reset();
    setBusy(true);
    try {
      await disconnectICloudAction();
      setCalendars(null);
      setMessage("Verbinding met iCloud verbroken.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-surface-line bg-surface p-4">
      <h2 className="mb-1 text-lg font-medium">iCloud-agenda</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Upload je uren als events naar een iCloud-agenda (via CalDAV).
      </p>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {message && <div className="mb-3 text-sm text-green-700">{message}</div>}

      {calendars ? (
        calendars.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft">Geen schrijfbare agenda gevonden.</p>
            <button type="button" onClick={() => setCalendars(null)}
              className="self-start rounded-md border border-surface-line px-4 py-2 text-sm">Terug</button>
          </div>
        ) : (
          <form action={handleSelect} className="flex flex-col gap-3">
            <label className="text-sm">Kies een agenda
              <select name="calendarUrl" defaultValue={calendars[0]?.url} className={inputClass}>
                {calendars.map((c) => <option key={c.url} value={c.url}>{c.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button disabled={busy} className="rounded-md bg-accent px-4 py-2 text-sm text-white">Opslaan</button>
              <button type="button" onClick={() => setCalendars(null)}
                className="rounded-md border border-surface-line px-4 py-2 text-sm">Annuleren</button>
            </div>
          </form>
        )
      ) : status.connected ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm">
            <div>Verbonden als <b>{status.appleId}</b></div>
            <div className="text-ink-soft">
              Agenda: {status.calendarName ?? <span className="text-amber-700">nog geen agenda gekozen</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {status.calendarName && (
              <button disabled={busy} onClick={handleUpload}
                className="rounded-md bg-accent px-4 py-2 text-sm text-white">
                {busy ? "Bezig…" : "Upload mijn uren naar iCloud"}
              </button>
            )}
            <button disabled={busy} onClick={loadCalendars}
              className="rounded-md border border-surface-line px-4 py-2 text-sm">
              {status.calendarName ? "Andere agenda kiezen" : "Agenda kiezen"}
            </button>
            <button disabled={busy} onClick={handleDisconnect}
              className="rounded-md border border-surface-line px-4 py-2 text-sm text-red-600">
              Verbinding verbreken
            </button>
          </div>
        </div>
      ) : (
        <form action={handleConnect} className="flex flex-col gap-3">
          <label className="text-sm">Apple ID (e-mail)
            <input name="appleId" type="email" required autoComplete="username" className={inputClass} /></label>
          <label className="text-sm">App-specifiek wachtwoord
            <input name="appPassword" type="password" required autoComplete="off" className={inputClass} /></label>
          <p className="text-xs text-ink-soft">
            Maak dit aan op appleid.apple.com → Inloggen en beveiliging → App-specifieke wachtwoorden.
          </p>
          <button disabled={busy} className="self-start rounded-md bg-accent px-4 py-2 text-sm text-white">
            {busy ? "Verbinden…" : "Verbinden met iCloud"}
          </button>
        </form>
      )}
    </section>
  );
}
