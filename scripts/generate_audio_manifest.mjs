import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const audioRoot = join(projectRoot, "public", "assets", "audio");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

const files = (await walk(audioRoot))
  .filter((path) => extname(path).toLowerCase() === ".ogg")
  .sort();
const manifest = {
  schemaVersion: 1,
  sourceReferenceCommit: "5c4ec098b36d44d6dde4de31cba422de8b4f2b24",
  files: await Promise.all(files.map(async (path) => {
    const bytes = await readFile(path);
    return {
      path: relative(audioRoot, path).replaceAll("\\", "/"),
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  })),
};

await writeFile(join(audioRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

