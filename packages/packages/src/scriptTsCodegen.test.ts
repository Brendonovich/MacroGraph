import { generateScriptTypeDeclarations } from "./scriptTsCodegen";
import { scriptHasErrors, validateScriptSource } from "./scriptTsValidate";
import type { IoDefinition } from "./scriptIoTypes";

const getType = () =>
	({
		expect: () => ({ inner: null }),
	}) as any;

const listStringDef: IoDefinition = {
	inputs: [{ id: "0", name: "A", type: { variant: "list", item: "string" } }],
	outputs: [{ id: "0", name: "Result", type: "string" }],
};

describe("scriptTsCodegen", () => {
	it("maps List<string> to string[]", () => {
		const dts = generateScriptTypeDeclarations(listStringDef, getType);
		expect(dts).toContain("A: string[]");
	});

	it("allows .find on inputs.A", () => {
		const diags = validateScriptSource(
			"inputs.A.find((x) => x === \"a\");",
			listStringDef,
			getType,
		);
		expect(scriptHasErrors(diags)).toBe(false);
	});

	it("maps corrupted list item {} via serialized fallback", () => {
		const def: IoDefinition = {
			inputs: [{ id: "0", name: "A", type: { variant: "list", item: {} as any } }],
			outputs: [],
		};
		const dts = generateScriptTypeDeclarations(def, getType);
		expect(dts).toContain("unknown[]");
	});
});
