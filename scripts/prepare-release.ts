// Bring every place that names the release version in line with package.json.
// The family release executor runs this as `release:prepare` with RELEASE_VERSION set.
// Running it again for the same version changes nothing.
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const manifest = JSON.parse(await readFile("package.json", "utf8")) as { name: string; version: string };
const version = process.env.RELEASE_VERSION ?? manifest.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) throw new Error(`invalid release version: ${version}`);
if (manifest.version !== version) throw new Error("package.json must already carry the release version.");

const pinned = new RegExp(`${manifest.name.replace(/[/.]/gu, "\\$&")}@\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?=/|\\s|$|\`)`, "gmu");
for (const path of ["README.md", "README.ja.md"]) {
  const source = await readFile(path, "utf8");
  const next = source.replace(pinned, `${manifest.name}@${version}`);
  if (next !== source) await writeFile(path, next);
}
