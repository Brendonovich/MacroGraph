import { getRemoteShellMode, remoteHostRpcRequest } from "@macrograph/runtime";

export async function remoteTwitchEnableAccount(credentialId: string) {
	if (!getRemoteShellMode()) {
		throw new Error("remoteTwitchEnableAccount is only for the remote editor.");
	}
	await remoteHostRpcRequest({
		method: "twitch.enableAccount",
		params: { credentialId },
	});
}

export async function remoteTwitchDisableAccount(credentialId: string) {
	if (!getRemoteShellMode()) {
		throw new Error("remoteTwitchDisableAccount is only for the remote editor.");
	}
	await remoteHostRpcRequest({
		method: "twitch.disableAccount",
		params: { credentialId },
	});
}
