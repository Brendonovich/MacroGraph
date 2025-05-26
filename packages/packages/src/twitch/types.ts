import { t } from "@macrograph/typesystem";
import type { Pkg } from ".";
import * as eventSub from "./eventSub";

export function createTypes(pkg: Pkg) {
	const UserSubscription = pkg.createStruct("User Subscription", (s) => ({
		tier: s.field("Tier", t.string()),
		userId: s.field("user ID", t.string()),
		userLogin: s.field("user Login", t.string()),
		userName: s.field("user Name", t.string()),
		planName: s.field("Plan Name", t.string()),
		gifted: s.field("Gifted", t.bool()),
		gifterName: s.field("Gifter Name", t.option(t.string())),
		gifterDisplayName: s.field("Gifter Display Name", t.option(t.string())),
		gifterId: s.field("Gifter ID", t.option(t.string())),
	}));

	const AnnouncementColors = pkg.createEnum("Announcement Color", (e) => [
		e.variant("blue"),
		e.variant("green"),
		e.variant("orange"),
		e.variant("purple"),
		e.variant("default"),
	]);

	const UserType = pkg.createEnum("User Type", (e) => [
		e.variant("Admin"),
		e.variant("Global Mod"),
		e.variant("Staff"),
		e.variant("Normal User"),
	]);

	const BroadcasterType = pkg.createEnum("Broadcaster Type", (e) => [
		e.variant("Affliate"),
		e.variant("Partner"),
		e.variant("Normal User"),
	]);

	const User = pkg.createStruct("User", (s) => ({
		id: s.field("ID", t.string()),
		login: s.field("Login", t.string()),
		displayName: s.field("Display Name", t.string()),
		userType: s.field("User Type", t.enum(UserType)),
		broadcasterType: s.field("Broadcaster Type", t.enum(BroadcasterType)),
		description: s.field("Description", t.string()),
		profileImage: s.field("Profile Image URL", t.string()),
		offlineImage: s.field("Offline Image URL", t.string()),
		createdAt: s.field("Created At", t.string()),
	}));

	const Chatter = pkg.createStruct("Chatter", (s) => ({
		user_id: s.field("ID", t.string()),
		user_login: s.field("Login", t.string()),
		user_name: s.field("Name", t.string()),
	}));

	const Reward = pkg.createStruct("Reward", (s) => ({
		id: s.field("ID", t.string()),
		title: s.field("Title", t.string()),
		cost: s.field("Cost", t.int()),
		prompt: s.field("Prompt", t.string()),
		enabled: s.field("Enabled", t.bool()),
		input_required: s.field("User Input Required", t.bool()),
		bgColor: s.field("Background Color", t.string()),
		maxRedemptionsPerStream: s.field("Max Per Stream", t.option(t.int())),
		maxRedemptionsPerUserPerStream: s.field(
			"Max Per User Per Stream",
			t.option(t.int()),
		),
		globalCooldown: s.field("Global Cooldown (s)", t.option(t.int())),
		paused: s.field("Paused", t.bool()),
		inStock: s.field("In Stock", t.bool()),
		skipRequestQueue: s.field("Skip Request Queue", t.bool()),
		redemptionsThisStream: s.field(
			"Redemptions This Stream",
			t.option(t.int()),
		),
		cooldownExpire: s.field("Cooldown Expires In", t.option(t.string())),
	}));

	const RedemptionStatus = pkg.createEnum("Redemption Status", (e) => [
		e.variant("Fulfilled"),
		e.variant("Cancelled"),
	]);

	const Redemption = pkg.createStruct("Redemption", (s) => ({
		id: s.field("ID", t.string()),
		userId: s.field("User ID", t.string()),
		userDisplayName: s.field("User Display Name", t.string()),
		userName: s.field("User Name", t.string()),
		rewardId: s.field("Reward ID", t.string()),
		rewardTitle: s.field("Reward Title", t.string()),
		rewardPrompt: s.field("Reward Prompt", t.string()),
		rewardCost: s.field("Reward Cost", t.string()),
		userInput: s.field("User Input", t.string()),
		updateStatus: s.field("Status", t.enum(RedemptionStatus)),
		redemptionDate: s.field("Redemption Date", t.string()),
	}));

	return {
		...eventSub.createTypes(pkg),
		UserSubscription,
		AnnouncementColors,
		UserType,
		BroadcasterType,
		User,
		Chatter,
		Reward,
		RedemptionStatus,
		Redemption,
	};
}

export type Types = ReturnType<typeof createTypes>;
