import { PropertyDef, createResourceType } from "@macrograph/runtime";
import { Pkg } from ".";
import { t } from "@macrograph/typesystem";

export const TwitchAccount = createResourceType({
  name: "Twitch Account",
  sources: (pkg: Pkg) =>
    [...pkg.ctx!.auth.accounts].map(([userId, account]) => ({
      id: userId,
      display: account.data.display_name,
      value: account,
    })),
});

export const accountProperty = {
  name: "Twitch Account",
  resource: TwitchAccount,
} satisfies PropertyDef;

export const defaultProperties = { account: accountProperty };

export const TwitchChat = createResourceType({
  name: "Twitch Channel",
  type: t.string(),
});
