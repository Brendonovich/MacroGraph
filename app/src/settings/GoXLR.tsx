import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { createSignal, Match, Show, Switch } from "solid-js";
import { Button, Input } from "./ui";
import { goxlr } from "@macrograph/packages";
import { None, Some } from "@macrograph/core";

const Schema = z.object({
  url: z.string(),
});

const GoXLR = () => {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Socket API</span>
      <Switch fallback="Loading...">
        <Match when={goxlr.ws.state().type === "disconnected"}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => {
                  goxlr.ws.setUrl(Some(d.url));
                }}
                class="flex flex-row space-x-4"
              >
                <Field name="url">
                  {(field, props) => (
                    <Input
                      {...props}
                      placeholder="GoXLR WS Url"
                      value={field.value}
                    />
                  )}
                </Field>
                <Button type="submit">Submit</Button>
              </Form>
            );
          }}
        </Match>
        <Match when={goxlr.ws.state().type === "connected"}>
          <div class="flex flex-row items-center space-x-4">
            <Button onClick={() => goxlr.ws.setUrl(None)}>Disconnect</Button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default () => {
  return (
    <>
      <GoXLR />
    </>
  );
};
