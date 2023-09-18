import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { streamlabs } from "@macrograph/packages";
import { Match, Switch } from "solid-js";
import { Button, Input } from "./ui";
import { None, Some } from "@macrograph/core";

const Schema = z.object({
  socketToken: z.string(),
});

const Api = () => {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Socket API</span>
      <Switch fallback="Loading...">
        <Match when={streamlabs.state().type === "disconnected"}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => {
                  streamlabs.setToken(Some(d.socketToken));
                }}
                class="flex flex-row space-x-4"
              >
                <Field name="socketToken">
                  {(field, props) => (
                    <Input
                      {...props}
                      type="password"
                      placeholder="Socket API Key"
                      value={field.value}
                    />
                  )}
                </Field>
                <Button type="submit">Submit</Button>
              </Form>
            );
          }}
        </Match>
        <Match when={streamlabs.state().type === "connected"}>
          <div class="flex flex-row items-center space-x-4">
            <Button onClick={() => streamlabs.setToken(None)}>
              Disconnect
            </Button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default () => {
  return (
    <>
      <Api />
    </>
  );
};
