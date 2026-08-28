import { execSync, spawnSync } from "child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(APP, "..", "..");
const STAGE = resolve(APP, "release", `staged-app-${Date.now().toString(36)}`);

// Renderer is pre-bundled; only electron main-process modules are needed at runtime.
const RUNTIME_DEPS = [
	"ws",
	"obs-websocket-js",
	"form-data",
	"uiohook-napi",
	"node-dtls-client",
	"coap-packet",
];

function robocopyNodeModules(src, dst) {
	if (!existsSync(src)) return;
	try {
		execSync(`robocopy "${src}" "${dst}" /E /XD .pnpm .vinxi /NJH /NJS /NDL /NFL /R:0 /W:0`, { stdio: "pipe" });
	} catch (e) {
		if (e.status > 7) throw e;
	}
}

function findElectronBuilderCli() {
	for (const base of [resolve(APP, "node_modules"), resolve(ROOT, "node_modules")]) {
		const cli = resolve(base, "electron-builder", "cli.js");
		if (existsSync(cli)) return cli;
	}
	throw new Error("electron-builder not found — run pnpm install at the repo root");
}

console.log("▶ Copying app files...");
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const dir of ["dist-electron", ".output/public", "remote-public"]) {
	const src = resolve(APP, dir);
	if (existsSync(src)) cpSync(src, resolve(STAGE, dir), { recursive: true });
}
if (existsSync(resolve(APP, "resources")))
	cpSync(resolve(APP, "resources"), resolve(STAGE, "resources"), { recursive: true });
const wn = resolve(APP, "electron", "whisper-native");
if (existsSync(wn)) cpSync(wn, resolve(STAGE, "whisper-native"), { recursive: true });

const pkg = JSON.parse(readFileSync(resolve(APP, "package.json"), "utf8"));
pkg.dependencies = Object.fromEntries(
	RUNTIME_DEPS.filter((dep) => pkg.dependencies?.[dep]).map((dep) => [dep, pkg.dependencies[dep]]),
);
delete pkg.devDependencies;
writeFileSync(resolve(STAGE, "package.json"), `${JSON.stringify(pkg, null, "\t")}\n`);

console.log("▶ Copying node_modules (root hoisted + desktop, then flatten)...");
const nmDst = resolve(STAGE, "node_modules");
mkdirSync(nmDst, { recursive: true });
robocopyNodeModules(resolve(ROOT, "node_modules"), nmDst);
robocopyNodeModules(resolve(APP, "node_modules"), nmDst);
execSync(`node ${resolve(APP, "scripts", "flatten-nm.mjs")} ${JSON.stringify(STAGE)}`, { stdio: "inherit" });

console.log("▶ Writing staged electron-builder config...");
const OUT_DIR = resolve(APP, "release", `build-${Date.now().toString(36)}`);
writeFileSync(resolve(STAGE, "electron-builder.staged.yml"), [
	"appId: macrograph.brendonovich.dev",
	"productName: MacroGraph",
	"directories:",
	`  buildResources: ${JSON.stringify(resolve(STAGE, "resources"))}`,
	`  output: ${JSON.stringify(OUT_DIR)}`,
	"files:",
	"  - dist-electron",
	'  - ".output/public/**/*"',
	"  - package.json",
	'  - "remote-public/**/*"',
	"extraResources:",
	"  - from: remote-public",
	"    to: remote-public",
	"    filter:",
	'      - "**/*"',
	"  - from: whisper-native",
	"    to: whisper-native",
	"    filter:",
	'      - "**/*"',
	"  - from: resources/icon.ico",
	"    to: icon.ico",
	"  - from: resources/icon.png",
	"    to: icon.png",
	"asar: true",
	"asarUnpack:",
	'  - "**/*.node"',
	'  - "**/whisper-addon*"',
	"compression: normal",
	"nodeGypRebuild: false",
	"npmRebuild: false",
	"buildDependenciesFromSource: false",
	"win:",
	"  cscLink:",
	"  forceCodeSigning: false",
	"  signAndEditExecutable: false",
	"  verifyUpdateCodeSignature: false",
	"  target:",
	"    - target: nsis",
	"      arch:",
	"        - x64",
	"  icon: icon.ico",
	"nsis:",
	"  oneClick: false",
	"  allowToChangeInstallationDirectory: true",
].join("\n"));

console.log("▶ Building installer...");
mkdirSync(resolve(STAGE, "resources"), { recursive: true });
const buildEnv = { ...process.env };
delete buildEnv.WIN_CSC_LINK;
delete buildEnv.CSC_LINK;
delete buildEnv.WIN_CSC_KEY_PASSWORD;
delete buildEnv.CSC_KEY_PASSWORD;
const r = spawnSync(process.execPath, [findElectronBuilderCli(), "--config", resolve(STAGE, "electron-builder.staged.yml")], {
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
		try {
			renameSync(src, dst);
		} catch {
			cpSync(src, dst, { recursive: true });
			rmSync(src, { recursive: true, force: true });
		}
	}
	rmSync(OUT_DIR, { recursive: true, force: true });
}

console.log("▶ Cleaning...");
for (const f of readdirSync(resolve(APP, "release"))) {
	if (f.startsWith("staged-app")) {
		try {
			rmSync(resolve(APP, "release", f), { recursive: true, force: true });
		} catch {}
	}
}
console.log("✓ Done — installer written to release/");
