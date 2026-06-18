import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("demo1234");
    expect(await verifyPassword("demo1234", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("demo1234");
    expect(await verifyPassword("nope", hash)).toBe(false);
  });
});
