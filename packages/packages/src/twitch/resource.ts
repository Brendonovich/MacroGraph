import { PropertyDef, ResourceType } from "@macrograph/runtime";
import { Pkg } from ".";

export const TwitchAccount = new ResourceType({
  name: "Twitch Account",
  sources: (pkg: Pkg) =>
    [...pkg.ctx!.auth.accounts].map(([userId, account]) => ({
      id: userId,
      display: account.data.display_name,
      value: userId,
    })),
});

export const accountProperty = {
  name: "Twitch Account",
  resource: TwitchAccount,
} satisfies PropertyDef;

export const defaultProperties = { account: accountProperty };
