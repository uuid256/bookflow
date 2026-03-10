import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.component.test.tsx", "jsdom"],
      ["src/**/*.ui.test.tsx", "jsdom"],
    ],
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: [
        "src/lib/**/*.ts",
        "src/app/**/actions.ts",
        "src/app/api/**/route.ts",
      ],
      exclude: [
        "src/lib/prisma.ts",
        "src/lib/auth.ts",
        "src/lib/auth-guard.ts",
        "src/types/**",
        "src/tests/**",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
