import reactAppConfig from "@kunal-singh/eslint-config/react-app";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["dist", "*.config.js", "*.config.ts"] },
  ...reactAppConfig,
]);
