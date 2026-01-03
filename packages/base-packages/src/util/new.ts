import { Effect } from "effect";
import { t } from "@macrograph/package-sdk";
import { Package } from "@macrograph/package-sdk/updated";

export default Package.define({ name: "Utilities" })
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
	});
