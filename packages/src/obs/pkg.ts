import { EventTypes } from "obs-websocket-js";
import { core } from "../../models";

export default core.createPackage<EventTypes>({
  name: "OBS Websocket",
});
