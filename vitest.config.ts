import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The suite runs in node by default, matching the pure logic tests that were
// already here. Component tests opt into a DOM per file with an
// `@vitest-environment happy-dom` docblock, so adding a browser like
// environment never slows the logic tests down. The `@/` alias is declared here
// because vitest does not read tsconfig paths on its own.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
