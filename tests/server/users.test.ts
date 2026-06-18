import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { createUser, listProfiles, changePassword } from "@/server/users";

beforeEach(async () => {
  await resetDb();
});

describe("createUser", () => {
  it("creates a user (username lowercased) and lists it as a profile", async () => {
    const res = await createUser({ name: "Sam", username: "Sam", password: "geheim123" });
    expect(res.ok).toBe(true);
    const profiles = await listProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].username).toBe("sam");
    expect(profiles[0].name).toBe("Sam");
  });

  it("rejects a duplicate username case-insensitively", async () => {
    await createUser({ name: "Sam", username: "sam", password: "geheim123" });
    const res = await createUser({ name: "Sam Two", username: "SAM", password: "geheim123" });
    expect(res.ok).toBe(false);
  });

  it("rejects a too-short password", async () => {
    const res = await createUser({ name: "Sam", username: "sam", password: "x" });
    expect(res.ok).toBe(false);
  });

  it("rejects an empty name", async () => {
    const res = await createUser({ name: "  ", username: "sam", password: "geheim123" });
    expect(res.ok).toBe(false);
  });
});

describe("changePassword", () => {
  async function makeUser() {
    const res = await createUser({ name: "Sam", username: "sam", password: "oudwachtwoord" });
    if (!res.ok) throw new Error("setup failed");
    return res.id;
  }

  it("changes the password when the current one is correct", async () => {
    const id = await makeUser();
    const res = await changePassword(id, "oudwachtwoord", "nieuwwachtwoord");
    expect(res.ok).toBe(true);
    // old password no longer works, new one does
    expect((await changePassword(id, "oudwachtwoord", "x123456")).ok).toBe(false);
    expect((await changePassword(id, "nieuwwachtwoord", "x123456")).ok).toBe(true);
  });

  it("rejects a wrong current password", async () => {
    const id = await makeUser();
    const res = await changePassword(id, "fout", "nieuwwachtwoord");
    expect(res.ok).toBe(false);
  });

  it("rejects a too-short new password", async () => {
    const id = await makeUser();
    const res = await changePassword(id, "oudwachtwoord", "x");
    expect(res.ok).toBe(false);
  });
});
