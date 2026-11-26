import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("test") },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
