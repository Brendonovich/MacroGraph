interface TikTokConnectionState {
	username: string;
	status: "disconnected" | "connecting" | "connected" | "error";
	connectionMethod: "websocket" | "polling" | null;
	roomId: string | null;
	error: string | null;
}

interface LifxDevice {
	id: string;
	addr: string;
	port: number;
	label: string;
	power: number;
	hue: number;
	saturation: number;
	brightness: number;
	kelvin: number;
}

interface ElectronAPI {
	platform: {
		saveProject(data: string, path: string): Promise<void>;
		loadProject(path: string): Promise<string>;
		url: null;
	};
	clipboard: {
		readText(): Promise<string>;
		writeText(text: string): Promise<void>;
	};
	dialog: {
		open(options?: any): Promise<string | null>;
		save(options?: any): Promise<string | null>;
		confirm(message: string, title?: string): Promise<boolean>;
	};
	shell: {
		execute(args: { command: string; shell: string }): Promise<void>;
		openExternal(url: string): Promise<void>;
	};
	fs: {
		list(path: string): Promise<Array<{ Dir: string } | { File: string }>>;
		readTextFile(path: string): Promise<string>;
		writeTextFile(path: string, content: string): Promise<void>;
		readBinaryFile(path: string): Promise<Uint8Array>;
		writeBinaryFile(path: string, data: number[]): Promise<void>;
		fileSize(path: string): Promise<number | null>;
	};
	tiktok: {
		connect(username: string, signApiKey?: string | null): Promise<void>;
		disconnect(username: string): Promise<void>;
		getState(username: string): Promise<TikTokConnectionState>;
		disconnectAll(): Promise<void>;
	};
	ws: {
		startServer(port: number): Promise<void>;
		stopServer(port: number): Promise<void>;
		send(args: { port: number; client: number | null; data: string }): Promise<void>;
		disconnectAllClients(): Promise<void>;
	};
	remoteHost: {
		start(args: { port: number; password?: string | null }): Promise<void>;
		stop(): Promise<void>;
		send(args: { port: number; client: number | null; except_client?: number | null; data: string }): Promise<void>;
		setPassword(password: string | null): Promise<void>;
	};
	outboundWs: {
		open(url: string): Promise<void>;
		close(url: string): Promise<void>;
		closeAll(): Promise<void>;
		send(args: { url: string; data: string }): Promise<void>;
		list(): Promise<string[]>;
		isConnected(url: string): Promise<boolean>;
		pruneExcept(keep: string[]): Promise<void>;
	};
	obs: {
		connect(args: { url: string; password?: string | null }): Promise<void>;
		disconnect(url: string): Promise<void>;
		disconnectAll(): Promise<void>;
		call(args: { url: string; requestType: string; requestData?: unknown }): Promise<unknown>;
		callBatch(args: { url: string; requests: { requestType: string; requestData?: unknown }[] }): Promise<unknown[]>;
	};
	oauth: {
		authorize(url: string): Promise<any>;
	};
	loginListen(): Promise<string>;
	audio: {
		enumerate(): Promise<Array<{ device_id: string; label: string }>>;
		play(args: { path: string; deviceName?: string }): Promise<{ id: string }>;
		stop(id: string): Promise<void>;
		setVolume(id: string, volume: number): Promise<void>;
		stopAll(): Promise<void>;
	};
	kbMouse: {
		simulateKeys(keys: string[], delay: number): Promise<void>;
		simulateMouse(button: string, delay: number): Promise<void>;
		setMousePosition(x: number, y: number, absolute: boolean): Promise<void>;
		startHooks(): Promise<void>;
		stopHooks(): Promise<void>;
	};
	crashLog: {
		append(kind: string, message: string): Promise<void>;
		path(): Promise<string>;
	};
	http: {
		fetch(args: { method: string; url: string; headers: [string, string][]; data: number[] | null; connectTimeout: number | null; maxRedirections: number | null }): Promise<number>;
		fetchMultipart(args: { url: string; headers: [string, string][]; fields: [string, string][]; filePath: string | null; fileFieldName: string | null; connectTimeout: number | null }): Promise<number>;
		fetchSend(rid: number): Promise<{ status: number; statusText: string; headers: [string, string][]; url: string }>;
		fetchReadBody(rid: number): Promise<number[]>;
		fetchCancel(rid: number): Promise<void>;
	};
	onEvent(channel: string, callback: (...args: any[]) => void): () => void;
	path: {
		convertFileSrc(path: string): Promise<string>;
	};
	ikea: {
		connect(host: string, securityCode: string): Promise<{ identity: string; psk: string; devices: any[] }>;
		disconnect(host: string): Promise<void>;
		listDevices(host: string): Promise<any[]>;
		getDevice(host: string, deviceId: number): Promise<any>;
		controlLight(host: string, deviceId: number, command: any): Promise<void>;
		startObserving(host: string): Promise<void>;
		stopObserving(host: string): Promise<void>;
	};
	lifx: {
		discover(manualAddr?: string): Promise<LifxDevice[]>;
		startObserving(): Promise<void>;
		stopObserving(): Promise<void>;
		setPower(args: { target: string; addr: string; port: number; level: boolean; duration: number }): Promise<void>;
		setColor(args: { target: string; addr: string; port: number; color: { hue?: number; saturation?: number; brightness?: number; kelvin?: number }; duration: number }): Promise<void>;
		getState(args: { target: string; addr: string; port: number }): Promise<LifxDevice | null>;
		cleanup(): Promise<void>;
	};
	elgatoKeyLight: {
		discover(manualAddr?: string): Promise<Array<{ id: string; name: string; addr: string; port: number }>>;
		startObserving(): Promise<void>;
		stopObserving(): Promise<void>;
		getState(args: { addr: string; port: number }): Promise<{ numberOfLights: number; lights: Array<{ on: number; brightness: number; temperature: number }> }>;
		setState(args: { addr: string; port: number; state: { on?: number; brightness?: number; temperature?: number } }): Promise<any>;
		toggle(args: { addr: string; port: number }): Promise<any>;
		incrBrightness(args: { addr: string; port: number; delta: number }): Promise<any>;
		incrTemperature(args: { addr: string; port: number; delta: number }): Promise<any>;
		cleanup(): Promise<void>;
	};
	stt: {
		sendAudioChunk(data: ArrayBuffer): void;
		enumerateDevices(): Promise<{ deviceId: string; label: string }[]>;
		loadModel(modelName: string): Promise<boolean>;
		unloadModel(): Promise<boolean>;
		isBackendAvailable(): Promise<boolean>;
		downloadModel(modelName: string): Promise<void>;
		getCachedModels(): Promise<{ name: string; path: string; size: number }[]>;
		deleteModel(modelName: string): Promise<boolean>;
		getStatus(): Promise<{ modelLoaded: boolean; currentModel: string | null; isCapturing: boolean; isTranscribing: boolean; error?: string | null }>;
		startCapture(micId: string, modelName?: string, settings?: { maxDurationSecs?: number; overlapSecs?: number }): Promise<{ success?: boolean; error?: string }>;
		stopCapture(): Promise<boolean>;
	};
}

interface Window {
	electronAPI: ElectronAPI;
}
