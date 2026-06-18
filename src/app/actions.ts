"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId, login, logout } from "@/lib/auth";
import {
  createEntry,
  updateEntry,
  deleteEntry,
} from "@/server/entries";
import {
  createLocation,
  updateLocation,
  archiveLocation,
} from "@/server/locations";
import { createUser } from "@/server/users";

async function requireUser(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Niet ingelogd.");
  return userId;
}

function num(form: FormData, key: string): number {
  return Number(form.get(key));
}
function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

export async function loginAction(formData: FormData) {
  const username = str(formData, "username").trim().toLowerCase();
  const ok = await login(username, str(formData, "password"));
  if (!ok) return { error: "Onjuiste gebruikersnaam of wachtwoord." };
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const username = str(formData, "username").trim().toLowerCase();
  const result = await createUser({
    name: str(formData, "name"),
    username,
    password: str(formData, "password"),
  });
  if (!result.ok) return { error: result.error };
  await login(username, str(formData, "password"));
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

export async function saveEntryAction(formData: FormData) {
  const userId = await requireUser();
  const id = str(formData, "id");
  const input = {
    date: str(formData, "date"),
    locationId: str(formData, "locationId"),
    startMinutes: num(formData, "startMinutes"),
    endMinutes: num(formData, "endMinutes"),
    breakMinutes: num(formData, "breakMinutes") || 0,
    note: (formData.get("note") as string) || null,
  };
  if (id) await updateEntry(userId, id, input);
  else await createEntry(userId, input);
  revalidatePath("/");
}

export async function deleteEntryAction(formData: FormData) {
  const userId = await requireUser();
  await deleteEntry(userId, str(formData, "id"));
  revalidatePath("/");
}

export async function saveLocationAction(formData: FormData) {
  const userId = await requireUser();
  const id = str(formData, "id");
  const data = {
    name: str(formData, "name"),
    color: str(formData, "color"),
    hourlyRate: Math.round(num(formData, "hourlyRateEuros") * 100),
  };
  if (id) await updateLocation(userId, id, data);
  else await createLocation(userId, data);
  revalidatePath("/instellingen");
}

export async function archiveLocationAction(formData: FormData) {
  const userId = await requireUser();
  await archiveLocation(userId, str(formData, "id"));
  revalidatePath("/instellingen");
}
