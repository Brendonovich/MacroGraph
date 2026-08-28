import { cpSync, readlinkSync, rmSync, existsSync, lstatSync, readdirSync } from "fs";
import { resolve } from "path";

const NM = resolve(process.argv[2], "node_modules");
const PNPM = resolve(NM, ".pnpm");

console.log("Flattening node_modules...");
let count = 0;

function flattenEntry(entryPath) {
	let stat;
	try {
		stat = lstatSync(entryPath);
	} catch {
		return;
	}

	if (stat.isSymbolicLink() || stat.isDirectory()) {
		try {
			const target = readlinkSync(entryPath);
			if (!existsSync(target)) return;
			rmSync(entryPath, { recursive: true, force: true });
			cpSync(target, entryPath, { recursive: true, verbatimSymlinks: false });
			count++;
		} catch {
			// Not a junction — walk real directories below.
		}
	}

	try {
		if (lstatSync(entryPath).isDirectory()) {
			for (const entry of readdirSync(entryPath)) {
				flattenEntry(resolve(entryPath, entry));
			}
		}
	} catch {
		// Removed or unreadable after flatten.
	}
}

if (existsSync(NM)) {
	for (const entry of readdirSync(NM)) {
		if (entry === ".pnpm") continue;
		flattenEntry(resolve(NM, entry));
	}
}

// Hoist packages from the live pnpm store so flattened packages resolve transitive deps.
if (existsSync(PNPM)) {
	for (const pkgDir of readdirSync(PNPM)) {
		const pkgNodeModules = resolve(PNPM, pkgDir, "node_modules");
		if (!existsSync(pkgNodeModules)) continue;
		for (const dep of readdirSync(pkgNodeModules)) {
			const depPath = resolve(pkgNodeModules, dep);
			let stat;
			try {
				stat = lstatSync(depPath);
			} catch {
				continue;
			}
			if (!stat.isDirectory()) continue;

			const targetDir = resolve(NM, dep);
			if (!existsSync(targetDir)) {
				cpSync(depPath, targetDir, { recursive: true, verbatimSymlinks: false });
				count++;
				flattenEntry(targetDir);
			}
		}
	}
}

console.log(`Flattened/hoisted ${count} packages`);
