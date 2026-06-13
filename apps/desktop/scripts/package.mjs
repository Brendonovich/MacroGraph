import { execSync, spawnSync } from "child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = resolve(APP, "release", `staged-app-${Date.now().toString(36)}`);

console.log("▶ Copying app files...");
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const dir of ["dist-electron", ".output/public", "remote-public"]) {
  const src = resolve(APP, dir);
  if (existsSync(src)) cpSync(src, resolve(STAGE, dir), { recursive: true });
}
cpSync(resolve(APP, "package.json"), resolve(STAGE, "package.json"));
if (existsSync(resolve(APP, "resources")))
  cpSync(resolve(APP, "resources"), resolve(STAGE, "resources"), { recursive: true });
const wn = resolve(APP, "electron", "whisper-native");
if (existsSync(wn)) cpSync(wn, resolve(STAGE, "whisper-native"), { recursive: true });

console.log("▶ Copying node_modules (junctions → then flatten)...");
const nmSrc = resolve(APP, "node_modules");
const nmDst = resolve(STAGE, "node_modules");
if (existsSync(nmSrc)) {
  mkdirSync(nmDst, { recursive: true });
  try {
    execSync(`robocopy "${nmSrc}" "${nmDst}" /MIR /XD .pnpm /NJH /NJS /NDL /NFL /R:0 /W:0`, { stdio: "pipe" });
  } catch (e) {
    if (e.status > 7) throw e;
  }
}
execSync(`node ${resolve(APP, "scripts", "flatten-nm.mjs")} ${JSON.stringify(STAGE)}`, { stdio: "inherit" });

console.log("▶ Writing staged electron-builder config...");
const OUT_DIR = resolve(APP, "release", `build-${Date.now().toString(36)}`);
writeFileSync(resolve(STAGE, "electron-builder.staged.yml"), [
  'appId: macrograph.brendonovich.dev',
  'productName: MacroGraph',
  'directories:',
  `  buildResources: ${JSON.stringify(resolve(STAGE, "resources"))}`,
  `  output: ${JSON.stringify(OUT_DIR)}`,
  'files:',
  '  - dist-electron',
  '  - ".output/public/**/*"',
  '  - "package.json"',
  '  - "remote-public/**/*"',
  'extraResources:',
  '  - from: remote-public',
  '    to: remote-public',
  '    filter:',
  '      - "**/*"',
  '  - from: whisper-native',
  '    to: whisper-native',
  '    filter:',
  '      - "**/*"',
  'asar: true',
  'asarUnpack:',
  '  - "**/*.node"',
  '  - "**/whisper-addon*"',
  'compression: normal',
  'nodeGypRebuild: false',
  'npmRebuild: false',
  'buildDependenciesFromSource: false',
  'win:',
  '  cscLink:',
  '  forceCodeSigning: false',
  '  signAndEditExecutable: false',
  '  verifyUpdateCodeSignature: false',
  '  target:',
  '    - target: nsis',
  '      arch:',
  '        - x64',
  '  icon: resources/icon.ico',
  'nsis:',
  '  oneClick: false',
  '  allowToChangeInstallationDirectory: true',
].join('\n'));

console.log("▶ Building installer...");
mkdirSync(resolve(STAGE, "resources"), { recursive: true });
const buildEnv = { ...process.env };
delete buildEnv.WIN_CSC_LINK;
delete buildEnv.CSC_LINK;
delete buildEnv.WIN_CSC_KEY_PASSWORD;
delete buildEnv.CSC_KEY_PASSWORD;
const eb = resolve(APP, "node_modules", "electron-builder", "cli.js");
const r = spawnSync(process.execPath, [
  eb, "--config", resolve(STAGE, "electron-builder.staged.yml"),
], {
  cwd: STAGE,
  stdio: "inherit",
  env: buildEnv,
});
if (r.error) throw r.error;
if (r.status !== 0) throw new Error(`electron-builder exited with code ${r.status}`);

console.log("▶ Moving installer to release/...");
if (existsSync(OUT_DIR)) {
  mkdirSync(resolve(APP, "release"), { recursive: true });
  for (const f of readdirSync(OUT_DIR)) {
    const src = resolve(OUT_DIR, f);
    const dst = resolve(APP, "release", f);
    try { renameSync(src, dst); }
    catch { cpSync(src, dst, { recursive: true }); rmSync(src, { recursive: true, force: true }); }
  }
  rmSync(OUT_DIR, { recursive: true, force: true });
}

console.log("▶ Cleaning...");
for (const f of readdirSync(resolve(APP, "release"))) {
  if (f.startsWith("staged-app")) {
    try { rmSync(resolve(APP, "release", f), { recursive: true, force: true }); } catch {}
  }
}
console.log("✓ Done — installer written to release/");
