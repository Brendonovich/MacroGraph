use std::{
	env,
	path::PathBuf,
	process::Command,
};

fn main() {
	let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
	let desktop_dir = manifest_dir
		.parent()
		.expect("src-tauri should live under apps/desktop");

	let remote_editor_pkg = manifest_dir.join("../../remote-editor/package.json");
	let remote_editor_vite = manifest_dir.join("../../remote-editor/vite.config.ts");
	let remote_public_index = manifest_dir.join("remote-public/index.html");

	println!("cargo:rerun-if-changed={}", remote_editor_pkg.display());
	println!("cargo:rerun-if-changed={}", remote_editor_vite.display());
	println!("cargo:rerun-if-changed={}", remote_public_index.display());

	let profile = env::var("PROFILE").unwrap_or_default();
	let should_build = profile == "release" || !remote_public_index.is_file();

	if should_build {
		eprintln!("Building remote editor assets (profile={profile})…");
		let status = Command::new(if cfg!(windows) { "pnpm.cmd" } else { "pnpm" })
			.args(["build:remote"])
			.current_dir(desktop_dir)
			.status()
			.expect("failed to spawn pnpm build:remote");

		if !status.success() {
			panic!("pnpm build:remote failed with {status}");
		}
	}

	tauri_build::build();
}
