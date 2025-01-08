import { None, Some, type Option } from "@macrograph/option";
import { createSignal } from "solid-js";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const ports = [
		59129, 20000, 39273, 42152, 43782, 46667, 35679, 37170, 38501, 33952, 30546,
	];

	const [state, setState] = createSignal<Option<WebSocket>>(None);

	const ws = new WebSocket("ws://localhost:59129/v1");

	ws.addEventListener("open", (event) => {
		setState(Some(ws));
	});

	// for (const port of ports) {
	// 	try {
	// 		const ws = new WebSocket(`ws://localhost:${port}/v1`);
	// 		ws.addEventListener("open", (event) => {
	// 			setState(Some(ws));
	// 		});
	// 		ws.addEventListener("error", (event) => {
	// 			console.log(`Port: ${port} not in use.`);
	// 		});
	// 	} catch {
	// 		console.log(`Port: ${port} not in use.`);
	// 	}
	// }

	console.log(state().unwrap());

	return { state, setState };
}
