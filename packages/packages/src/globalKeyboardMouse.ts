import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type EventBus, createEventBus } from "@solid-primitives/event-bus";
import { events, type Key, commands } from "tauri-plugin-kb-mouse";

export function pkg() {
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
			await commands.simulateKeys(
				ctx.getInput(io.keys) as Key[],
				ctx.getInput(io.delay),
			);
		},
	});

	const Button = pkg.createEnum("Button", (e) => [
		e.variant("Left"),
		e.variant("Middle"),
		e.variant("Right"),
	]);
	pkg.registerType(Button);

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
			await commands.simulateMouse(
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
			await commands.setMousePosition(
				ctx.getInput(io.x),
				ctx.getInput(io.y),
				ctx.getInput(io.absolute),
			);
		},
	});

	const pressedKeys = new Set<Key>();

	const busses = new Map<Key, EventBus<"pressed" | "released">>();

	for (const a of alphabet) {
		busses.set(a, createEventBus());
	}

	events.keyDown.listen((e) => {
		const { key, appFocused } = e.payload;
		if (appFocused) return;

		pressedKeys.add(key);
		busses.get(key)?.emit("pressed");
	});

	events.keyUp.listen((e) => {
		const { key, appFocused } = e.payload;

		pressedKeys.delete(key);

		if (appFocused) return;

		busses.get(key)?.emit("released");
	});

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

const alphabet = new Set<Key>([
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
