import type { Ctx } from "./ctx";

export default function (ctx: Ctx) {
	return <div>{ctx.state().isSome() ? "Connected" : "Disconnected"}</div>;
}
