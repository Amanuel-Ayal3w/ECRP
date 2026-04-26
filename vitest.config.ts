import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

function loadEnvLocal(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = fs.readFileSync(path.resolve(".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key) env[key] = val;
    }
  } catch {
    // no .env.local — DATABASE_URL must be set in environment
  }
  return env;
}

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    env: loadEnvLocal(),
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "src/lib/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
