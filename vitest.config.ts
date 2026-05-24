import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "bin/**/*.test.ts", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts", "bin/**/*.ts", "scripts/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/__fixtures__/**",
        "src/data/**",
        "src/lib/embedder-default-loader.ts",
        "src/lib/embedder-types.ts",
        "scripts/**",
        "bin/**",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
