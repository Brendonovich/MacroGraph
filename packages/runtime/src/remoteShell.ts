let remoteShellMode = false;

/** Called from {@link Core} constructor. */
export function setRemoteShellMode(v: boolean) {
	remoteShellMode = v;
}

/** When true, integration packages must not open sockets or call remote APIs (remote editor UI). */
export function getRemoteShellMode() {
	return remoteShellMode;
}
