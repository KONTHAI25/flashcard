import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL(".", import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "**/*.test.cjs", "scripts/**", "playwright-report/**", "test-results/**", "blob-report/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
