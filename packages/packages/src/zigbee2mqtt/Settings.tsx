import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { createForm } from "@tanstack/solid-form";
import { For, Match, Switch } from "solid-js";

import type { Ctx } from "./ctx";

const ADAPTERS = [
	{ value: "zstack", label: "Z-Stack (Texas Instruments)" },
	{ value: "ember", label: "Ember (Silicon Labs)" },
	{ value: "deconz", label: "deCONZ (Conbee/Raspbee)" },
	{ value: "zigate", label: "ZiGate" },
	{ value: "ezsp", label: "EZSP" },
];

export default function (ctx: Ctx) {
	const serialForm = createForm(() => ({
		defaultValues: { port: ctx.serialPort().toNullable() ?? "" },
		onSubmit: ({ value }) => {
			if (value.port.length > 0) ctx.setSerialPort(Some(value.port));
		},
	}));

	const adapterForm = createForm(() => ({
		defaultValues: { adapter: ctx.adapter().unwrapOr("zstack") },
		onSubmit: ({ value }) => {
			ctx.setAdapter(Some(value.adapter));
		},
	}));

	const mqttPortForm = createForm(() => ({
		defaultValues: {
			port: String(ctx.mqttPort().toNullable() ?? 1886),
		},
		onSubmit: ({ value }) => {
			const p = parseInt(value.port, 10);
			if (!isNaN(p)) ctx.setMqttPort(Some(p));
		},
	}));

	const frontendForm = createForm(() => ({
		defaultValues: {
			port: String(ctx.frontendPort().toNullable() ?? 8080),
		},
		onSubmit: ({ value }) => {
			const p = parseInt(value.port, 10);
			if (!isNaN(p)) ctx.setFrontendPort(Some(p));
		},
	}));

	return (
		<div class="flex flex-col space-y-4">
			<span class="text-neutral-400 font-medium">Zigbee2MQTT</span>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					serialForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<serialForm.Field name="port">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Serial port (e.g. COM3 or /dev/ttyACM0)"
						/>
					)}
				</serialForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					adapterForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<adapterForm.Field name="adapter">
					{(field) => (
						<select
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							class="bg-neutral-800 text-white rounded px-2 py-1"
						>
							<For each={ADAPTERS}>{(a) => <option value={a.value}>{a.label}</option>}</For>
						</select>
					)}
				</adapterForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					mqttPortForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<mqttPortForm.Field name="port">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="MQTT Port (default 1886)"
						/>
					)}
				</mqttPortForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					frontendForm.handleSubmit();
				}}
				class="flex flex-row space-x-4"
			>
				<frontendForm.Field name="port">
					{(field) => (
						<Input
							onInput={(e) => field().handleChange(e.currentTarget.value)}
							onBlur={() => field().handleBlur()}
							value={field().state.value}
							placeholder="Web UI Port (default 8080)"
						/>
					)}
				</frontendForm.Field>
				<Button type="submit" class="shrink-0" size="md">
					Save
				</Button>
			</form>

			<Switch>
				<Match when={ctx.state().type === "disconnected"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-neutral-500">Stopped</span>
						<Button onClick={() => ctx.connect()} size="md">
							Start Zigbee2MQTT
						</Button>
					</div>
				</Match>
				<Match when={ctx.state().type === "connecting"}>
					<div class="flex flex-row items-center space-x-4">
						<span class="text-yellow-400">Starting Zigbee2MQTT...</span>
					</div>
				</Match>
				<Match when={ctx.state().type === "connected"}>
					<div class="flex flex-col space-y-2">
						<div class="flex flex-row items-center space-x-4">
							<span class="text-green-400">Running</span>
							<Button
								onClick={() => ctx.disconnect()}
								size="md"
							>
								Stop
							</Button>
						</div>
						<p class="text-sm text-neutral-400">
							Web UI:{" "}
							<a
								href={`http://localhost:${ctx.frontendPort().toNullable() ?? 8080}`}
								target="_blank"
								class="underline text-blue-400"
							>
								http://localhost:{ctx.frontendPort().toNullable() ?? 8080}
							</a>
						</p>
					</div>
				</Match>
				<Match when={ctx.state().type === "error"}>
					{(() => {
						const s = ctx.state() as Extract<ReturnType<typeof ctx.state>, { type: "error" }>;
						return (
							<div class="flex flex-col space-y-2">
								<span class="text-red-400">Error: {s.message}</span>
								<Button onClick={() => ctx.connect()} size="md">
									Retry
								</Button>
							</div>
						);
					})()}
				</Match>
			</Switch>
		</div>
	);
}
