import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/** Flat config for ESLint 9 + Next 16. eslint-config-next 16 ships native flat
    config arrays, so we spread them directly (no FlatCompat shim needed). */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "node_modules/**", "crop_*.png"],
  },
];

export default eslintConfig;
