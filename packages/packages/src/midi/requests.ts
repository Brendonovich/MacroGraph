import type { CreateNonEventSchema, RunProps } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { type Pkg, STATUS_BYTES } from "./";
import { MIDIOutput } from "./resource";

const defaultProperties = {
	output: { name: "MIDI Output", resource: MIDIOutput },
};

export function register(pkg: Pkg) {
	function createMIDIExecSchema<TIO = void>({
		variant,
		...s
	}: Omit<
		CreateNonEventSchema<typeof defaultProperties, TIO>,
		"type" | "properties" | "run"
	> & {
		variant: keyof typeof STATUS_BYTES;
		run(args: RunProps<typeof defaultProperties, TIO>): Array<number>;
	}) {
		const statusByte = STATUS_BYTES[variant];

		pkg.createSchema({
			...s,
			name: `Send ${s.name}`,
			type: "exec",
			properties: defaultProperties,
			createIO: (args) => ({
				channel: args.io.dataInput({
					id: "channel",
					name: "Channel",
					type: t.int(),
				}),
				...s.createIO(args),
			}),
			run(args) {
				const { ctx, properties, io } = args;

				const output = ctx
					.getProperty(properties.output)
					.expect("No output available!");

				const channel = ctx.getInput(io.channel);

				const bytes = s.run(args);

				bytes.unshift((statusByte << 4) | channel);

				output.send(bytes);
			},
		});
	}

	createMIDIExecSchema({
		name: "Note On",
		variant: "noteOn",
		createIO: ({ io }) => ({
			note: io.dataInput({ id: "note", name: "Note", type: t.int() }),
			velocity: io.dataInput({
				id: "velocity",
				name: "Velocity",
				type: t.int(),
			}),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.note), ctx.getInput(io.velocity)];
		},
	});

	createMIDIExecSchema({
		name: "Note Off",
		variant: "noteOff",
		createIO: ({ io }) => ({
			note: io.dataInput({ id: "note", name: "Note", type: t.int() }),
			velocity: io.dataInput({
				id: "velocity",
				name: "Velocity",
				type: t.int(),
			}),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.note), ctx.getInput(io.velocity)];
		},
	});

	createMIDIExecSchema({
		name: "Control Change",
		variant: "controlChange",
		createIO: ({ io }) => ({
			control: io.dataInput({ id: "control", name: "Control", type: t.int() }),
			data: io.dataInput({ id: "data", name: "Data", type: t.int() }),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.control), ctx.getInput(io.data)];
		},
	});

	createMIDIExecSchema({
		name: "Program Change",
		variant: "programChange",
		createIO: ({ io }) => ({
			program: io.dataInput({ id: "program", name: "Program", type: t.int() }),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.program)];
		},
	});

	createMIDIExecSchema({
		name: "Channel Aftertouch",
		variant: "channelAftertouch",
		createIO: ({ io }) => ({
			pressure: io.dataInput({
				id: "pressure",
				name: "Pressure",
				type: t.int(),
			}),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.pressure)];
		},
	});

	createMIDIExecSchema({
		name: "Pitch Bend",
		variant: "pitchBend",
		createIO: ({ io }) => ({
			delta: io.dataInput({ id: "delta", name: "Delta", type: t.int() }),
		}),
		run({ ctx, io }) {
			return [ctx.getInput(io.delta)];
		},
	});
}
