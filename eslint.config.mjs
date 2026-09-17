import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "**/*.test.cjs", "scripts/**", "playwright-report/**", "test-results/**", "blob-report/**"] },
  ...coreWebVitals,
  ...nextTypescript,
  {
    // eslint-config-next 16 enables the React Compiler lint set. This app
    // deliberately reads browser storage and mirrors props into refs inside
    // effects after hydration (localStorage-only data layer), which those
    // rules reject wholesale; keep the rest of the strict set enabled.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;
