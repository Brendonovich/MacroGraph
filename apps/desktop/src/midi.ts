import { listen } from "@tauri-apps/api/event";

export const inputs = new Map();
export const outputs = new Map();
export const sysexEnabled = true;

listen("tauri-plugin-midi|inputModified", (e) => {});
listen("tauri-plugin-midi|outputModified", (e) => {});
