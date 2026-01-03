import { createEventBus } from "@solid-primitives/event-bus";
import { createEventListener } from "@solid-primitives/event-listener";

import type { CreateEventSchema } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type Pkg, STATUS_BYTES } from "./";
import { midiInputProperty } from "./resource";

type Tuple<T, N extends number> = N extends N
	? number extends N
		? T[]
		: _TupleOf<T, N, []>
	: never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
	? R
	: _TupleOf<T, N, [T, ...R]>;

function arrayIsLength<const TLength extends number, TArrayElement>(
	array: Array<TArrayElement>,
	length: TLength,
): array is Tuple<TArrayElement, TLength> {
	return array.length === length;
}

const defaultProperties = { input: midiInputProperty };

export function register(pkg: Pkg) {
	function createMIDIEventSchema<TFire, TIO = void>({
		handleMessage,
		...s
	}: Omit<
		CreateEventSchema<typeof defaultProperties, TIO, TFire>,
		"type" | "createListener" | "properties"
	> & { handleMessage: (data: Array<number>) => TFire | undefined }) {
		pkg.createSchema({
			...s,
			type: "event",
			properties: defaultProperties,
			createListener({ ctx, properties }) {
				const input = ctx.getProperty(properties.input).expect("No input");

				const bus = createEventBus<TFire>();

				input.open();
				createEventListener(input, "midimessage", ((e: MIDIMessageEvent) => {
					const data = Array.from(e.data!);

					const fire = handleMessage(data);
					if (!fire) return;

					bus.emit(fire);
				}) as any);

				return bus;
			},
		});
	}

	createMIDIEventSchema({
		name: "Note On",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.noteOn) return;

			const [status, note, velocity] = data;
			const channel = status & 0b1111;

			return { channel, note, velocity };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			note: io.dataOutput({ id: "note", name: "Note", type: t.int() }),
			velocity: io.dataOutput({
				id: "velocity",
				name: "Velocity",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.note, data.note);
			ctx.setOutput(io.velocity, data.velocity);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Note Off",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.noteOff) return;

			const [status, note, velocity] = data;
			const channel = status & 0b1111;

			return { channel, note, velocity };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			note: io.dataOutput({ id: "note", name: "Note", type: t.int() }),
			velocity: io.dataOutput({
				id: "velocity",
				name: "Velocity",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.note, data.note);
			ctx.setOutput(io.velocity, data.velocity);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Control Change",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.controlChange) return;

			const [status, control, _data] = data;
			const channel = status & 0b1111;

			return { channel, control, data: _data };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			control: io.dataOutput({ id: "control", name: "Control", type: t.int() }),
			data: io.dataOutput({ id: "data", name: "Data", type: t.int() }),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.control, data.control);
			ctx.setOutput(io.data, data.data);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Program Change",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.programChange) return;

			const [status, program, _data] = data;
			const channel = status & 0b1111;

			return { channel, program, data: _data };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			program: io.dataOutput({ id: "program", name: "Program", type: t.int() }),
			data: io.dataOutput({ id: "data", name: "Data", type: t.int() }),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.program, data.program);
			ctx.setOutput(io.data, data.data);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Channel Aftertouch",
		handleMessage(data) {
			if (!arrayIsLength(data, 2)) return;
			if (data[0] >> 4 !== STATUS_BYTES.channelAftertouch) return;

			const [status, pressure] = data;
			const channel = status & 0b1111;

			return { channel, pressure };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			pressure: io.dataOutput({
				id: "pressure",
				name: "Pressure",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.pressure, data.pressure);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Polyphonic Aftertouch",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.polyphonicAftertouch) return;

			const [status, note, pressure] = data;
			const channel = status & 0b1111;

			return { channel, note, pressure };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			pressure: io.dataOutput({
				id: "pressure",
				name: "Pressure",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channel, data.channel);
			ctx.setOutput(io.pressure, data.pressure);

			return ctx.exec(io.exec);
		},
	});

	createMIDIEventSchema({
		name: "Pitch Bend",
		handleMessage(data) {
			if (!arrayIsLength(data, 3)) return;
			if (data[0] >> 4 !== STATUS_BYTES.pitchBend) return;

			const [status, lsb, msb] = data;
			const channel = status & 0b1111;

			const delta = (msb << 7) | lsb;

			return { channel, delta };
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			channel: io.dataOutput({ id: "channel", name: "Channel", type: t.int() }),
			delta: io.dataOutput({ id: "delta", name: "Delta", type: t.int() }),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.delta, data.delta);

			return ctx.exec(io.exec);
		},
	});
}
