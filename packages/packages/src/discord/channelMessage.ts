import type { Core, Node } from "@macrograph/runtime";

import { getLocalFileSizeBytes, sanitizeFilePath } from "../pathUtil";

export const DISCORD_WEBHOOK_MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Default per-file attachment limit; Discord may allow more per guild boost. */
export const DISCORD_BOT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type SendChannelMessageArgs = {
	core: Core;
	botToken: string;
	channelId: string;
	content: string;
	allowEveryone: boolean;
	filePath?: string | null;
	maxFileBytes: number;
	limitLabel: string;
	node: Node;
};

const UPLOAD_PROGRESS_INTERVAL_MS = 5000;
const UPLOAD_PROGRESS_PERCENT_STEP = 25;

/** Emit at each 25% step and/or every 5s while uploading (whichever comes first). */
export function createThrottledUploadProgressHandler(
	emit: (percent: number, sent: number, total: number) => void,
): (percent: number, sent: number, total: number) => void {
	let lastEmittedBucket = -1;
	let lastEmitTime = 0;

	return (percent, sent, total) => {
		const now = Date.now();
		const bucket =
			percent >= 100
				? 100
				: Math.floor(percent / UPLOAD_PROGRESS_PERCENT_STEP) *
					UPLOAD_PROGRESS_PERCENT_STEP;
		const crossedQuarter = bucket > lastEmittedBucket;
		const dueByTime =
			lastEmitTime === 0 || now - lastEmitTime >= UPLOAD_PROGRESS_INTERVAL_MS;

		if (!crossedQuarter && !dueByTime) return;

		if (crossedQuarter) lastEmittedBucket = bucket;
		lastEmitTime = now;

		emit(percent, sent, total);
	};
}

function finishUpload(
	core: Core,
	node: Node,
	filePath: string | null,
	status: number,
	limitLabel: string,
) {
	if (!filePath) return;
	if (status === 413) {
		core.warn(`HTTP 413 Payload Too Large — ${limitLabel}`, node);
	}
	core.print(`Upload finished (HTTP ${status})`, node);
}

export async function sendDiscordChannelMessage(
	args: SendChannelMessageArgs,
): Promise<number> {
	const {
		core,
		botToken,
		channelId,
		content,
		allowEveryone,
		maxFileBytes,
		limitLabel,
		node,
	} = args;

	const filePath = args.filePath ? sanitizeFilePath(args.filePath) : null;
	const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
	const payload = {
		content,
		allowed_mentions: {
			parse: allowEveryone ? ["everyone"] : [],
		},
	};
	const authHeader = `Bot ${botToken}`;

	if (filePath) {
		const fileName = filePath.split(/[\/\\]/).at(-1) ?? filePath;
		core.print(`Uploading ${fileName}…`, node);

		const size = await getLocalFileSizeBytes(filePath);
		if (size !== null && size > maxFileBytes) {
			const sizeMb = (size / (1024 * 1024)).toFixed(1);
			core.warn(
				`File is ${sizeMb} MB; ${limitLabel} (expect HTTP 413).`,
				node,
			);
		}
	}

	const onUploadProgress = createThrottledUploadProgressHandler(
		(percent, sent, total) => {
			const sentMb = (sent / (1024 * 1024)).toFixed(1);
			const totalMb = (total / (1024 * 1024)).toFixed(1);
			core.warn(
				total > 0
					? `Upload ${percent}% (${sentMb} / ${totalMb} MB)`
					: `Upload ${percent}%`,
				node,
			);
		},
	);

	let status: number;

	if (filePath && core.fetchMultipart) {
		({ status } = await core.fetchMultipart(
			url,
			{ payload_json: JSON.stringify(payload) },
			{ path: filePath, fieldName: "files[0]" },
			{
				headers: { Authorization: authHeader },
				onProgress: onUploadProgress,
			},
		));
	} else if (filePath) {
		const { readBinaryFile } = await import("@tauri-apps/api/fs");
		const formData = new FormData();
		formData.set("payload_json", JSON.stringify(payload));
		formData.set(
			"files[0]",
			new Blob([await readBinaryFile(filePath)]),
			filePath.split(/[\/\\]/).at(-1)!,
		);
		const response = await core.fetch(url, {
			method: "POST",
			headers: { Authorization: authHeader },
			body: formData,
		});
		status = response.status;
	} else {
		const response = await core.fetch(url, {
			method: "POST",
			headers: {
				Authorization: authHeader,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});
		status = response.status;
	}

	if (filePath) {
		finishUpload(core, node, filePath, status, limitLabel);
	}

	return status;
}
