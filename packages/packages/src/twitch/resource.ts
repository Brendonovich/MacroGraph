import { PropertyDef, createResourceType } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { Pkg } from ".";

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

export const TwitchChannel = createResourceType({
  name: "Twitch Channel",
  type: t.string(),
});
