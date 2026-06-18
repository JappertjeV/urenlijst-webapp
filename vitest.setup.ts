import "@testing-library/jest-dom/vitest";

process.env.TZ = "UTC"; // make date assertions stable on any machine
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.SESSION_SECRET =
  "test-secret-test-secret-test-secret-1234567890";
