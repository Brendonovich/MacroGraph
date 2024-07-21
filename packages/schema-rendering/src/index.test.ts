import { pkg } from "@macrograph/json";
import { describe, test } from "vitest";

import { renderSchema } from ".";

const jsonPkg = pkg();

describe("render", () => {
	test("works", () => {
		console.log(
			JSON.stringify(
				renderSchema(jsonPkg.schemas.get("JSON Get String") as any),
				null,
				4,
			),
		);

		console.log(
			JSON.stringify(
				renderSchema(jsonPkg.schemas.get("To JSON") as any),
				null,
				4,
			),
		);
	});
});
