"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, getCurrentUserId, startSession } from "@/auth/session";
import { throttles, waitMessage } from "@/auth/throttle";
import { UserError } from "@/domain/errors";
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

// Alleen meldingen die voor de gebruiker bedoeld zijn gaan terug naar de
// browser. Andere fouten (Prisma, bugs) bevatten schema- en querydetails;
// die loggen we en vervangen we door de algemene melding.
function asError(e: unknown, fallback: string): { error: string } {
  if (e instanceof UserError) return { error: e.message };
  console.error(e);
  return { error: fallback };
}

// ---- account ----

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const username = str(formData, "username").trim().toLowerCase();
  // Per gebruikersnaam, ook voor namen die niet bestaan: anders verraadt
  // het verschil in afremmen welke namen echt zijn.
  const wait = throttles.login.retryAfterMs(username);
  if (wait > 0) return { error: waitMessage(wait) };
  const userId = await verifyCredentials(username, str(formData, "password"));
  if (!userId) {
    throttles.login.fail(username);
    return { error: "Onjuiste gebruikersnaam of wachtwoord." };
  }
  throttles.login.reset(username);
  await startSession(userId);
  redirect("/");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const wait = throttles.register.retryAfterMs("register");
  if (wait > 0) return { error: waitMessage(wait) };
  // Elke poging telt, ook geslaagde: dit remt zowel massaal aanmaken als
  // het aftasten van bestaande gebruikersnamen af.
  throttles.register.fail("register");
  let result;
  try {
    result = await createUser({
      name: str(formData, "name"),
      username: str(formData, "username"),
      password: str(formData, "password"),
    });
  } catch (e) {
    return asError(e, "Account aanmaken mislukt.");
  }
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
  const wait = throttles.password.retryAfterMs(userId);
  if (wait > 0) return { error: waitMessage(wait) };
  const result = await changePassword(
    userId,
    str(formData, "currentPassword"),
    str(formData, "newPassword"),
  );
  if (!result.ok) {
    if (result.error === "Huidig wachtwoord klopt niet.") throttles.password.fail(userId);
    return { error: result.error };
  }
  throttles.password.reset(userId);
  // Het nieuwe wachtwoord maakt alle bestaande sessies ongeldig (ook op
  // andere apparaten); deze sessie krijgt meteen een nieuwe vingerafdruk.
  await startSession(userId);
  return { ok: true };
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
