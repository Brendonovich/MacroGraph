import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";

export const [remoteHostSettings, setRemoteHostSettings] = makePersisted(
	createStore({ enabled: false, port: 37564, password: "" }),
	{ name: "macrograph-remote-host" },
);
