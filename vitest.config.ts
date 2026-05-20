import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    // Node environment: the snapshot test renders via renderToStaticMarkup
    // (pure SSR — no DOM needed), and the fixture loader reads DXFs via
    // node:fs. Using jsdom here would externalize node: builtins for
    // browser compat and break the fixture loader on CI.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
