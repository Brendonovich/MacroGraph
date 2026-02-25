import obs from "./obs/new-engine";
import twitch from "./twitch/engine";
import util from "./util/engine";
import websocketClient from "./websocket-client/engine";
import websocketServer from "./websocket-server/engine";

export default {
	obs,
	twitch,
	util,
	"websocket-client": websocketClient,
	"websocket-server": websocketServer,
};
