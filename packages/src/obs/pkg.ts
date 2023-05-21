import { EventTypes } from "obs-websocket-js";
import { core, Package } from "@macrograph/core";

const pkg: Package<EventTypes> = core.createPackage<EventTypes>({
  name: "OBS Websocket",
});

export default pkg;
