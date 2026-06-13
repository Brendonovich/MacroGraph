import { cpSync, readlinkSync, rmSync, existsSync, lstatSync, readdirSync } from "fs";
import { resolve } from "path";

const NM = resolve(process.argv[2], "node_modules");
const PNPM = resolve(NM, ".pnpm");

console.log("Flattening node_modules...");
let count = 0;

function flattenDir(dir) {
  for (const entry of readdirSync(dir)) {
    const entryPath = resolve(dir, entry);
    const stat = lstatSync(entryPath);
    // On Windows, pnpm directory junctions appear as symlinks (isDirectory=false, isSymbolicLink=true)
    if (!stat.isSymbolicLink() && !stat.isDirectory()) continue;
    if (stat.isDirectory() && entry.startsWith("@")) { flattenDir(entryPath); continue; }
    try {
      const target = readlinkSync(entryPath);
      const sourceDir = target; // target is absolute
      if (!existsSync(sourceDir)) continue;
      rmSync(entryPath, { recursive: true, force: true });
      cpSync(sourceDir, entryPath, { recursive: true, verbatimSymlinks: false });
      count++;
    } catch {
      // Not a junction
    }
  }
}

flattenDir(NM);
rmSync(PNPM, { recursive: true, force: true });
console.log(`Flattened ${count} packages`);
