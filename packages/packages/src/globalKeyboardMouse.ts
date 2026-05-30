import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type EventBus, createEventBus } from "@solid-primitives/event-bus";

let unlistenFns: Array<() => void> = [];

export function pkg() {
	unlistenFns.forEach((fn) => fn());
	unlistenFns = [];

	window.electronAPI.kbMouse.startHooks().catch(() => {});

	const pkg = new Package({
		name: "Global Mouse & Keyboard",
	});

	pkg.createSchema({
		name: "Emulate Keyboard Input",
		type: "exec",
		createIO: ({ io }) => ({
			keys: io.dataInput({
				id: "keys",
				name: "Keys",
				type: t.list(t.string()),
			}),
			delay: io.dataInput({
				id: "delay",
				name: "Release Delay",
				type: t.int(),
			}),
		}),
		async run({ ctx, io }) {
			await window.electronAPI.kbMouse.simulateKeys(
				ctx.getInput(io.keys),
				ctx.getInput(io.delay),
			);
		},
	});

	const Button = pkg.createEnum("Button", (e) => [
		e.variant("Left"),
		e.variant("Middle"),
		e.variant("Right"),
	]);

	pkg.createSchema({
		name: "Emulate Mouse Input",
		type: "exec",
		createIO: ({ io }) => ({
			button: io.dataInput({
				id: "button",
				name: "Button",
				type: t.enum(Button),
			}),
			delay: io.dataInput({
				id: "delay",
				name: "Release Delay",
				type: t.int(),
			}),
		}),
		async run({ ctx, io }) {
			await window.electronAPI.kbMouse.simulateMouse(
				ctx.getInput(io.button).variant,
				ctx.getInput(io.delay),
			);
		},
	});

	pkg.createSchema({
		name: "Set Mouse Position",
		type: "exec",
		createIO: ({ io }) => ({
			x: io.dataInput({
				id: "x",
				name: "X",
				type: t.float(),
			}),
			y: io.dataInput({
				id: "y",
				name: "Y",
				type: t.float(),
			}),
			absolute: io.dataInput({
				id: "absolute",
				name: "Absolute",
				type: t.bool(),
			}),
		}),
		async run({ ctx, io }) {
			await window.electronAPI.kbMouse.setMousePosition(
				ctx.getInput(io.x),
				ctx.getInput(io.y),
				ctx.getInput(io.absolute),
			);
		},
	});

	const pressedKeys = new Set<string>();

	const busses = new Map<string, EventBus<"pressed" | "released">>();

	for (const a of alphabet) {
		busses.set(a, createEventBus());
	}

	const unlistenKeyDown = window.electronAPI.onEvent("kb:keyDown", (payload: unknown) => {
		const { key, appFocused } = payload as { key: string; appFocused: boolean };
		if (appFocused) return;

		pressedKeys.add(key);
		busses.get(key)?.emit("pressed");
	});
	unlistenFns.push(unlistenKeyDown);

	const unlistenKeyUp = window.electronAPI.onEvent("kb:keyUp", (payload: unknown) => {
		const { key, appFocused } = payload as { key: string; appFocused: boolean };

		pressedKeys.delete(key);

		if (appFocused) return;

		busses.get(key)?.emit("released");
	});
	unlistenFns.push(unlistenKeyUp);

	for (const a of alphabet) {
		if (typeof a !== "string") continue;
		pkg.createSchema({
			name: `${a.slice(3)} Key`,
			type: "event",
			createListener: () => busses.get(a)!,
			createIO({ io }) {
				return {
					pressed: io.execOutput({
						id: "pressed",
						name: "Pressed",
					}),
					released: io.execOutput({
						id: "released",
						name: "Released",
					}),
				};
			},
			run({ ctx, data, io }) {
				return ctx.exec(data === "pressed" ? io.pressed : io.released);
			},
		});
	}

	for (const a of alphabet) {
		if (typeof a !== "string") continue;
		pkg.createSchema({
			name: `${a.slice(3)} Key Pressed`,
			type: "pure",
			createIO({ io }) {
				return io.dataOutput({
					id: "value",
					type: t.bool(),
				});
			},
			run({ ctx, io }) {
				ctx.setOutput(io, pressedKeys.has(a));
			},
		});
	}

	return pkg;
}

const alphabet = new Set<string>([
	"KeyA",
	"KeyB",
	"KeyC",
	"KeyD",
	"KeyE",
	"KeyF",
	"KeyG",
	"KeyH",
	"KeyI",
	"KeyJ",
	"KeyK",
	"KeyL",
	"KeyM",
	"KeyN",
	"KeyO",
	"KeyP",
	"KeyQ",
	"KeyR",
	"KeyS",
	"KeyT",
	"KeyU",
	"KeyV",
	"KeyW",
	"KeyX",
	"KeyY",
	"KeyZ",
]);
