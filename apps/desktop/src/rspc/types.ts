export type RemoteServerMessage =
	| string
	| { Text: string }
	| { ConnectedWithUser: { username: string } }
	| "Connected"
	| "Disconnected";
