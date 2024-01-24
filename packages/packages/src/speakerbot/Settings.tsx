import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Switch } from "solid-js";
import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from "./ctx";

const Schema = z.object({
  url: z.string(),
});

export default ({ state, setUrl }: Ctx) => {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Socket API</span>
      <Switch fallback="Loading...">
        <Match when={state().type === "disconnected"}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => {
                  setUrl(Some(d.url));
                }}
                class="flex flex-row space-x-4"
              >
                <Field name="url">
                  {(field, props) => (
                    <Input
                      {...props}
                      placeholder="Speakerbot WS URL"
                      value={field.value}
                    />
                  )}
                </Field>
                <Button type="submit">Submit</Button>
              </Form>
            );
          }}
        </Match>
        <Match when={state().type === "connected"}>
          <div class="flex flex-row items-center space-x-4">
            <Button onClick={() => setUrl(None)}>Disconnect</Button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
