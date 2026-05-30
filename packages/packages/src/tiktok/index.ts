import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type Ctx, createCtx } from "./ctx";

export type Events = {
	chat: {
		user: string;
		comment: string;
	};
	gift: {
		user: string;
		giftName: string;
		diamonds: number;
		repeatCount: number;
	};
	member: {
		user: string;
	};
	follow: {
		user: string;
	};
	share: {
		user: string;
	};
	like: {
		user: string;
		likeCount: number;
	};
};

export function pkg() {
	const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "TikTok Live",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.createEventSchema({
		name: "On TikTok Chat",
		event: "chat",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
				comment: io.dataOutput({
					id: "comment",
					name: "Comment",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.setOutput(io.comment, data.comment);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "On TikTok Gift",
		event: "gift",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
				giftName: io.dataOutput({
					id: "giftName",
					name: "Gift Name",
					type: t.string(),
				}),
				diamonds: io.dataOutput({
					id: "diamonds",
					name: "Diamonds",
					type: t.int(),
				}),
				repeatCount: io.dataOutput({
					id: "repeatCount",
					name: "Repeat Count",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.setOutput(io.giftName, data.giftName);
			ctx.setOutput(io.diamonds, data.diamonds);
			ctx.setOutput(io.repeatCount, data.repeatCount);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "On TikTok Member Join",
		event: "member",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "On TikTok Follow",
		event: "follow",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "On TikTok Share",
		event: "share",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.exec(io.exec);
		},
	});

	pkg.createEventSchema({
		name: "On TikTok Like",
		event: "like",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				user: io.dataOutput({
					id: "user",
					name: "User",
					type: t.string(),
				}),
				likeCount: io.dataOutput({
					id: "likeCount",
					name: "Like Count",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.user, data.user);
			ctx.setOutput(io.likeCount, data.likeCount);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
