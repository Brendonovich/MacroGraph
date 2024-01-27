import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Show, Suspense, Switch } from "solid-js";
import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from "./ctx";

const Schema = z.object({
  url: z.string(),
});

export default ({ access, requestAccess }: Ctx) => {
  return (
    <div class="flex flex-col space-y-2">
      <Suspense fallback="Requesting MIDI Access...">
        <Show
          when={access()}
          fallback={
            <Button onClick={requestAccess}>Request MIDI Access</Button>
          }
        >
          {(access) => <> {access().inputs.size} access granted!</>}
        </Show>
      </Suspense>
    </div>
  );
};
