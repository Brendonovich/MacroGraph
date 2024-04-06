import { action, reload } from "@solidjs/router";
import { deleteCookie } from "vinxi/http";
import { z } from "zod";
import { getAuthState, getUser } from "~/api";
import { lucia } from "~/lucia";

export const CREDENTIALS = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const IS_LOGGED_IN = "isLoggedIn";

export const logOutAction = action(async () => {
  "use server";

  const authState = await getAuthState();

  if (authState) await lucia.invalidateSession(authState.session.id);

  deleteCookie(IS_LOGGED_IN);

  throw reload({
    revalidate: [getUser.key],
  });
});
