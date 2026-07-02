import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Domain/data/action tests run in node; component tests opt into jsdom
    // with a `// @vitest-environment jsdom` pragma at the top of the file.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
