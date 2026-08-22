import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

interface AudioManifest {
  readonly schemaVersion: number;
  readonly files: ReadonlyArray<{ path: string; bytes: number; sha256: string }>;
}

const audioRoot = fileURLToPath(new URL("../../public/assets/audio/", import.meta.url));

describe("audio asset integrity", () => {
  test("all shipped Ogg derivatives match the audited manifest", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../../public/assets/audio/manifest.json", import.meta.url), "utf8"),
    ) as AudioManifest;

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.files).toHaveLength(23);
    for (const entry of manifest.files) {
      const bytes = await readFile(`${audioRoot}/${entry.path}`);
      expect(bytes.byteLength, entry.path).toBe(entry.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), entry.path).toBe(entry.sha256);
    }
  });
});

