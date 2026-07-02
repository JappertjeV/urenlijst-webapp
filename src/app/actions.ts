"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, getCurrentUserId, startSession } from "@/auth/session";
import { changePassword, createUser, verifyCredentials } from "@/data/users";
import {
  createEntry,
  deleteEntry,
  updateEntry,
  type EntryInput,
} from "@/data/entries";
import {
  addLocationRate,
  archiveLocation,
  createLocation,
  deleteLocationRate,
  updateLocation,
  updateLocationRate,
} from "@/data/locations";

// Elke actie GEEFT fouten TERUG als { error } — nooit gooien richting de
// client: Next redigeert foutmeldingen in productie tot een nietszeggende
// generieke melding. `redirect()` gooit intern en moet dus buiten try/catch.
export type ActionResult = { ok: true } | { error: string };
export type ActionState = ActionResult | null;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}
function num(form: FormData, key: string): number {
  return Number(form.get(key));
}

async function requireUser(): Promise<string | null> {
  return getCurrentUserId();
}

const NOT_LOGGED_IN = { error: "Niet ingelogd." } as const;

function asError(e: unknown, fallback: string): { error: string } {
  return { error: e instanceof Error ? e.message : fallback };
}

// ---- account ----

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await verifyCredentials(str(formData, "username"), str(formData, "password"));
  if (!userId) return { error: "Onjuiste gebruikersnaam of wachtwoord." };
  await startSession(userId);
  redirect("/");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const result = await createUser({
    name: str(formData, "name"),
    username: str(formData, "username"),
    password: str(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  await startSession(result.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  const result = await changePassword(
    userId,
    str(formData, "currentPassword"),
    str(formData, "newPassword"),
  );
  return result.ok ? { ok: true } : { error: result.error };
}

// ---- urenblokken ----

export async function saveEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  const id = str(formData, "id");
  const input: EntryInput = {
    date: str(formData, "date"),
    locationId: str(formData, "locationId"),
    startMinutes: num(formData, "startMinutes"),
    endMinutes: num(formData, "endMinutes"),
    breakMinutes: num(formData, "breakMinutes") || 0,
    note: str(formData, "note").trim() || null,
  };
  try {
    if (id) await updateEntry(userId, id, input);
    else await createEntry(userId, input);
  } catch (e) {
    return asError(e, "Opslaan mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  try {
    await deleteEntry(userId, str(formData, "id"));
  } catch (e) {
    return asError(e, "Verwijderen mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- werklocaties & tarieven ----

export async function saveLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  const id = str(formData, "id");
  const name = str(formData, "name").trim();
  if (!name) return { error: "Vul een naam in." };
  const data = {
    name,
    color: str(formData, "color"),
    hourlyRate: Math.round(num(formData, "hourlyRateEuros") * 100) || 0,
  };
  try {
    if (id) await updateLocation(userId, id, data);
    else await createLocation(userId, data);
  } catch (e) {
    return asError(e, "Opslaan mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  try {
    await archiveLocation(userId, str(formData, "id"));
  } catch (e) {
    return asError(e, "Archiveren mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  const id = str(formData, "id");
  const hourlyRate = Math.round(num(formData, "hourlyRateEuros") * 100);
  const validFrom = str(formData, "validFrom");
  if (!validFrom) return { error: "Kies een ingangsdatum." };
  if (!(hourlyRate > 0)) return { error: "Vul een geldig uurtarief in." };
  try {
    if (id) await updateLocationRate(userId, id, { hourlyRate, validFrom });
    else await addLocationRate(userId, str(formData, "locationId"), hourlyRate, validFrom);
  } catch (e) {
    return asError(e, "Opslaan mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  if (!userId) return NOT_LOGGED_IN;
  try {
    await deleteLocationRate(userId, str(formData, "id"));
  } catch (e) {
    return asError(e, "Verwijderen mislukt.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
