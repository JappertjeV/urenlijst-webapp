import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { useTestDb } from "../helpers/db";
import { OVERLAP_MESSAGE } from "@/domain/overlap";

// De actions praten met de echte datalaag; alleen sessie, cache en
// navigatie van Next worden vervangen.
const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/auth/session", () => ({
  getCurrentUserId: async () => session.userId,
  startSession: async (id: string) => {
    session.userId = id;
  },
  endSession: async () => {
    session.userId = null;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import {
  changePasswordAction,
  deleteEntryAction,
  loginAction,
  registerAction,
  saveEntryAction,
  saveLocationAction,
} from "@/app/actions";
import { createLocation } from "@/data/locations";
import { listEntries } from "@/data/entries";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

let cleanup: () => void;
beforeAll(() => {
  cleanup = useTestDb();
});
afterAll(() => cleanup());

describe("register + login", () => {
  it("registreert en logt direct in (redirect naar /)", async () => {
    await expect(
      registerAction(null, form({ name: "Jasper", username: "jasper", password: "geheim123" })),
    ).rejects.toThrow("REDIRECT:/");
    expect(session.userId).not.toBeNull();
    session.userId = null;
  });

  it("geeft registratiefouten terug als { error } in plaats van te gooien", async () => {
    const result = await registerAction(
      null,
      form({ name: "Dubbel", username: "jasper", password: "geheim123" }),
    );
    expect(result).toEqual({ error: "Die gebruikersnaam bestaat al." });
  });

  it("logt in met juiste gegevens en weigert foute met een { error }", async () => {
    await expect(
      loginAction(null, form({ username: "JASPER ", password: "geheim123" })),
    ).rejects.toThrow("REDIRECT:/");
    expect(session.userId).not.toBeNull();
    session.userId = null;

    const result = await loginAction(null, form({ username: "jasper", password: "fout" }));
    expect(result).toEqual({ error: "Onjuiste gebruikersnaam of wachtwoord." });
  });
});

describe("mutaties vereisen een sessie", () => {
  it.each([
    ["saveEntryAction", () => saveEntryAction(null, form({ date: "2026-07-01" }))],
    ["deleteEntryAction", () => deleteEntryAction(null, form({ id: "x" }))],
    ["saveLocationAction", () => saveLocationAction(null, form({ name: "X" }))],
    ["changePasswordAction", () => changePasswordAction(null, form({}))],
  ])("%s → { error } zonder login", async (_name, run) => {
    session.userId = null;
    expect(await run()).toEqual({ error: "Niet ingelogd." });
  });
});

describe("saveEntryAction", () => {
  it("maakt een blok aan, en geeft overlap terug als inline { error }", async () => {
    await expect(
      loginAction(null, form({ username: "jasper", password: "geheim123" })),
    ).rejects.toThrow("REDIRECT:/");
    const userId = session.userId;
    if (!userId) throw new Error("geen sessie");
    const loc = await createLocation(userId, { name: "Kantoor", color: "#7c5cff", hourlyRate: 1200 });

    const ok = await saveEntryAction(
      null,
      form({
        date: "2026-07-01", locationId: loc.id,
        startMinutes: "540", endMinutes: "1020", breakMinutes: "30", note: "eerste",
      }),
    );
    expect(ok).toEqual({ ok: true });

    const overlap = await saveEntryAction(
      null,
      form({
        date: "2026-07-01", locationId: loc.id,
        startMinutes: "600", endMinutes: "700", breakMinutes: "0", note: "",
      }),
    );
    expect(overlap).toEqual({ error: OVERLAP_MESSAGE });

    const entries = await listEntries(userId, { from: "2026-07-01", to: "2026-07-01" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.note).toBe("eerste");
  });

  it("bewerkt een bestaand blok via het id-veld", async () => {
    const userId = session.userId;
    if (!userId) throw new Error("geen sessie");
    const [entry] = await listEntries(userId, { from: "2026-07-01", to: "2026-07-01" });
    if (!entry) throw new Error("geen blok");

    const result = await saveEntryAction(
      null,
      form({
        id: entry.id, date: "2026-07-01", locationId: entry.locationId,
        startMinutes: "480", endMinutes: "960", breakMinutes: "15", note: "aangepast",
      }),
    );
    expect(result).toEqual({ ok: true });
    const [updated] = await listEntries(userId, { from: "2026-07-01", to: "2026-07-01" });
    expect(updated).toMatchObject({ startMinutes: 480, note: "aangepast" });
  });
});

describe("changePasswordAction", () => {
  it("geeft datalaagfouten door als { error }", async () => {
    const result = await changePasswordAction(
      null,
      form({ currentPassword: "fout", newPassword: "nieuwgeheim" }),
    );
    expect(result).toEqual({ error: "Huidig wachtwoord klopt niet." });
  });
});
