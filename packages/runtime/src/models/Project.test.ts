import { twitch, utils } from "@macrograph/packages";
import { describe, expect, test } from "vitest";
import { Core } from "./Core";

describe("Project.deserialize", () => {
	test("Default values apply after connections are created (#402)", async () => {
		const PROJECT_JSON = {
			name: "New Project",
			graphIdCounter: 1,
			graphs: [
				{
					id: 0,
					name: "Graph 0",
					nodeIdCounter: 5,
					nodes: {
						"3": {
							id: 3,
							name: "Create Custom Reward",
							position: { x: 221, y: 225 },
							schema: { package: "Twitch Events", id: "Create Custom Reward" },
							defaultValues: { in: null },
							properties: { account: { default: true } },
							foldPins: false,
						},
						"4": {
							id: 4,
							name: "Create Struct",
							position: { x: -49, y: 259 },
							schema: { package: "Utils", id: "Create Struct" },
							defaultValues: {
								title: "",
								prompt: "",
								cost: 0,
								bgColor: "",
								enabled: false,
								userInputRequired: false,
								maxRedemptionsPerStream: null,
								maxRedemptionsPerUserPerStream: null,
								globalCooldown: null,
								paused: false,
								inStock: false,
								skipRequestQueue: false,
								redemptionsThisStream: null,
								cooldownExpire: null,
							},
							properties: {},
							foldPins: false,
						},
					},
					commentBoxes: [],
					variables: [],
					connections: [
						{ from: { node: 4, output: "" }, to: { node: 3, input: "in" } },
					],
				},
			],
			customEventIdCounter: 0,
			customEvents: [],
			counter: 0,
			resources: [],
			variables: [],
		};

		const core = new Core({});

		core.registerPackage(twitch.pkg);
		core.registerPackage(utils.pkg);

		core.load(PROJECT_JSON as any);

		console.log(core.project.graphs.get(0)!.nodes);
		expect(core.project.graphs.get(0)!.nodes.get(4)!);
	});
});
