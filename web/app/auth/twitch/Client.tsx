"use client";

import { z } from "zod";
import { STATE, TOKEN } from "./types";
import { useEffect, useState } from "react";

export default function ({
  token,
  state,
}: {
  token: z.infer<typeof TOKEN>;
  state: z.infer<typeof STATE>;
}) {
  const [mutating, setMutating] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    fetch(`http://localhost:${state.port}?access_token=${token.access_token}`, {
      method: "POST",
      cache: "no-store",
      mode: "cors",
    }).then(() => setMutating(false));
  }, []);

  return (
    <h1>
      {mutating ? "Sending to MacroGraph" : "You can close this window now!"}
    </h1>
  );
}
