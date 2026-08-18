import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const coreRoot = fileURLToPath(new URL("../core", import.meta.url));
const forbiddenImports =
  /from\s+["'](?:node:|react(?:-dom)?|three|@react-three\/|[^"']*(?:presentation|ui|audio|platform)[^"']*)["']/;
const forbiddenBrowserGlobals = /\b(?:window|document|HTMLElement|localStorage)\b/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extname(entry.name) === ".ts" ? [path] : [];
  });
}

test("the game core has no renderer, React, UI, audio, or browser dependency", () => {
  const violations = sourceFiles(coreRoot).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const reasons = [
      forbiddenImports.test(source) ? "forbidden import" : null,
      forbiddenBrowserGlobals.test(source) ? "browser global" : null,
    ].filter(Boolean);
    return reasons.map((reason) => `${path}: ${reason}`);
  });

  expect(violations).toEqual([]);
});
