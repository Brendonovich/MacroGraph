import type OBSWebSocket from "obs-websocket-js";

import type { NativeObsClient } from "./nativeClient";

export type ObsSocketLike = OBSWebSocket | NativeObsClient;
