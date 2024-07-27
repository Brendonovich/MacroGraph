import type { UnlistenFn } from "@tauri-apps/api/event";
import { events, commands } from "./bindings";

// https://webaudio.github.io/web-midi-api

class TauriMIDIAccess extends EventTarget implements MIDIAccess {
	sysexEnabled = true;

	inputs = new Map<string, TauriMIDIInput>();
	outputs = new Map<string, TauriMIDIOutput>();

	onstatechange: ((this: MIDIAccess, ev: Event) => any) | null = null;

	addEventListener<K extends keyof MIDIAccessEventMap>(
		type: K,
		listener: (this: MIDIAccess, ev: MIDIAccessEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions,
	) {
		super.addEventListener(type, listener, options);
	}

	removeEventListener<K extends keyof MIDIAccessEventMap>(
		type: K,
		listener: (this: MIDIAccess, ev: MIDIAccessEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	) {
		super.removeEventListener(type, listener, options);
	}

	constructor() {
		super();

		events.stateChange.listen((event) => {
			const { inputs, outputs } = event.payload;

			let dirty = false;

			for (const [id, input] of this.inputs) {
				if (!inputs.includes(id)) {
					this.inputs.delete(id);
					input.state = "disconnected";

					dirty = true;
				}
			}

			for (const inputName of inputs) {
				if (this.inputs.has(inputName)) continue;

				const input = new TauriMIDIInput(inputName);
				input.state = "connected";

				this.inputs.set(inputName, input);

				dirty = true;
			}

			for (const [id, output] of this.outputs) {
				if (!outputs.includes(id)) {
					this.outputs.delete(id);
					output.state = "disconnected";

					dirty = true;
				}
			}

			for (const outputName of outputs) {
				if (this.outputs.has(outputName)) continue;

				const output = new TauriMIDIOutput(outputName);
				output.state = "connected";

				this.outputs.set(outputName, output);

				dirty = true;
			}

			if (dirty) this.dispatchEvent(new Event("statechange"));
		});
	}
}

class TauriMIDIPort extends EventTarget implements MIDIPort {
	connection: MIDIPortConnectionState = "closed";
	readonly id: string;
	manufacturer = null;
	onstatechange: ((this: MIDIPort, ev: Event) => any) | null = null;
	state: MIDIPortDeviceState = "disconnected";
	readonly version = null;

	constructor(
		public name: string,
		public readonly type: MIDIPortType,
	) {
		super();

		this.id = name;
	}

	async open(): Promise<MIDIPort> {
		if (this.connection === "open" || this.connection === "pending")
			return this;

		if (this.state === "disconnected") {
			this.connection = "pending";

			access.dispatchEvent(new Event("statechange"));
			this.dispatchEvent(new Event("statechange"));

			return this;
		}

		if (this.type === "input") await commands.openInput(this.id);
		else await commands.openOutput(this.id);

		this.connection = "open";

		access.dispatchEvent(new Event("statechange"));
		this.dispatchEvent(new Event("statechange"));

		return this;
	}

	async close(): Promise<MIDIPort> {
		if (this.connection === "closed") return this;

		if (this.type === "input") await commands.closeInput(this.id);
		else await commands.closeOutput(this.id);

		this.connection = "closed";

		access.dispatchEvent(new Event("statechange"));
		this.dispatchEvent(new Event("statechange"));

		return this;
	}
}

class TauriMIDIMessageEvent extends Event implements MIDIMessageEvent {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/MIDIMessageEvent/data) */
	readonly data: Uint8Array;

	constructor(type: string, eventInitDict?: MIDIMessageEventInit) {
		super(type, eventInitDict);

		this.data = eventInitDict?.data!;
	}
}

class TauriMIDIInput extends TauriMIDIPort implements MIDIInput {
	constructor(name: string) {
		super(name, "input");
	}

	private stopListening?: Promise<UnlistenFn>;

	open() {
		if (!this.stopListening)
			this.stopListening = events.midiMessage.listen((event) => {
				const [inputName, data] = event.payload;

				if (inputName !== this.name) return;

				this.dispatchEvent(
					new TauriMIDIMessageEvent("midimessage", {
						data: new Uint8Array(data),
					}),
				);
			});

		return super.open();
	}

	close() {
		this.stopListening?.then((cb) => cb());

		return super.close();
	}

	private _onmidimessage: ((this: MIDIInput, ev: Event) => any) | null = null;

	get onmidimessage() {
		return this._onmidimessage;
	}

	set onmidimessage(cb: ((this: MIDIInput, ev: Event) => any) | null) {
		this._onmidimessage = cb;

		if (this.connection !== "open") this.open();
	}
}

class TauriMIDIOutput extends TauriMIDIPort implements MIDIOutput {
	constructor(name: string) {
		super(name, "output");
	}

	send(data: number[]) {
		if (this.state === "disconnected")
			throw new Error("MIDIOutput is disconnected");

		const p =
			this.state === "connected" && this.connection === "closed"
				? this.open()
				: Promise.resolve();

		p.then(() => commands.outputSend(this.name, data));
	}
}

const access = new TauriMIDIAccess();

navigator.requestMIDIAccess = () => Promise.resolve(access);
