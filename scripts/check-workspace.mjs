import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredPaths = [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "eslint.config.mjs",
  ".prettierrc.json",
  ".env.example",
  "apps/web/package.json",
  "apps/web/src/main.ts",
  "apps/api/package.json",
  "apps/api/src/main.ts",
  "packages/shared/package.json",
  "packages/shared/src/index.ts",
  "packages/shared/src/contracts/common.ts",
  "packages/shared/src/contracts/auth.ts",
  "packages/shared/src/contracts/profile.ts",
  "packages/shared/src/contracts/conversations.ts",
  "packages/shared/src/contracts/chat-sse.ts"
];

const missing = requiredPaths.filter((relativePath) => {
  return !existsSync(resolve(process.cwd(), relativePath));
});

if (missing.length > 0) {
  console.error("Workspace check failed. Missing paths:");
  for (const relativePath of missing) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

console.log("Workspace check passed.");

