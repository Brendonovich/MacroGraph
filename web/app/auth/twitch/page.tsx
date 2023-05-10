import { Suspense } from "react";
import { env } from "~/env.mjs";
import Client from "./Client";
import { PARAMS, TOKEN } from "./types";
import { z } from "zod";

export const runtime = "edge";

export default async function ({ searchParams }: any) {
  const params = PARAMS.parse(searchParams);

  return (
    <Suspense fallback={<h1>Fetching Token...</h1>}>
      <TokenGetter params={params} />
    </Suspense>
  );
}

const TokenGetter: any = async ({
  params,
}: {
  params: z.infer<typeof PARAMS>;
}) => {
  const body = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: params.state.redirect_uri,
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const json = await res.json();

  console.log(json);

  const token = TOKEN.parse(json);

  return <Client token={token} state={params.state} />;
};
