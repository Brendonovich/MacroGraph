import { Effect, Option } from "effect";
import { Package, PackageEngine, t } from "@macrograph/package-sdk";

import { TickEvent } from "./types";

export class EngineDef extends PackageEngine.define({ events: [TickEvent] }) {}

export default Package.define({ name: "Utilities", engine: EngineDef })
	.addSchema("Print", {
		type: "exec",
		name: "Print",
		io: (c) => ({ in: c.in.data("in", t.String, { name: "Input" }) }),
		run: function* ({ io }) {
			yield* Effect.log(`Log: ${io.in}`);
		},
	})
	.addSchema("ConcatStrings", {
		type: "pure",
		name: "Concat Strings",
		io: (c) => ({
			str1: c.in.data("str1", t.String),
			str2: c.in.data("str2", t.String),
			result: c.out.data("result", t.String),
		}),
		run: ({ io }) => {
			io.result(io.str1 + io.str2);
		},
	})
	.addSchema("IntToString", {
		type: "pure",
		name: "Int To String",
		io: (c) => ({
			int: c.in.data("int", t.Int),
			str: c.out.data("str", t.String),
		}),
		run: ({ io }) => {
			io.str(String(io.int));
		},
	})
	.addSchema("Branch", {
		type: "base",
		name: "Branch",
		io: (c) => ({
			execIn: c.in.exec("exec"),
			condition: c.in.data("condition", t.Bool),
			trueOut: c.out.exec("trueOut"),
			falseOut: c.out.exec("falseOut"),
		}),
		run: function* ({ io }) {
			return io.condition ? io.trueOut : io.falseOut;
		},
	})
	.addSchema("FormatString", {
		type: "pure",
		name: "Format String",
		properties: { string: { name: "String", type: t.String } },
		io: (c) => {
			const value = c.properties.string ?? "";
			const blocks = parseFormatString(value);

			return {
				blocks: blocks.map((block) => {
					if ("text" in block) return block.text;

					return c.in.data(block.variable, t.String, { name: block.variable });
				}),
				output: c.out.data("", t.String),
			};
		},
		run: ({ io }) => {
			io.output(io.blocks.join(""));
		},
	})
	.addSchema("Tick", {
		type: "event",
		name: "Tick",
		event: (e) => Option.some(e),
		io: (c) => {
			return c.out.data("tick", t.Int);
		},
		run: ({ io, event }) => {
			io(event.tick);
		},
	});

function parseFormatString(input: string) {
	const chars = input.split("");

	const blocks: Array<{ text: string } | { variable: string }> = [];

	let buffer = "";
	let isInVariable = false;

	for (let i = 0; i < chars.length; i++) {
		const char = chars[i];

		if (char === "{") {
			if (chars[i + 1] === "{") {
				buffer += "{";
				i++;
				continue;
			}

			if (buffer !== "") blocks.push({ text: buffer });

			buffer = "";
			isInVariable = true;
		} else if (chars[i] === "}") {
			if (isInVariable) {
				blocks.push({ variable: buffer });
			} else {
				if (chars[i + 1] === "}") {
					buffer += "}";
					i++;
					continue;
				}

				blocks.push({ text: buffer });
			}

			isInVariable = false;
			buffer = "";
		} else buffer += chars[i];
	}

	if (buffer !== "") blocks.push({ text: buffer });

	return blocks;
}
