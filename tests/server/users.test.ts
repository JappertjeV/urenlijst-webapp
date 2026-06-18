import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { createUser, listProfiles } from "@/server/users";

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
