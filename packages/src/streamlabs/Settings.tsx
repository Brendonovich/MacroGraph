import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Switch, createSignal } from "solid-js";
import { None, Some } from "@macrograph/core";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from ".";

const Schema = z.object({
  socketToken: z.string(),
});

export default ({ auth, core }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <div class="flex flex-col items-start space-y-2">
      <span class="text-neutral-400 font-medium">Socket API</span>
      <Switch fallback="Loading...">
        <Match when={auth.state().type === "disconnected"}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => {
                  auth.setToken(Some(d.socketToken));
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
        <Match when={auth.state().type === "connected"}>
          <div class="flex flex-row items-center space-x-4">
            <Button onClick={() => auth.setToken(None)}>Disconnect</Button>
          </div>
        </Match>
      </Switch>

      <span class="text-neutral-400 font-medium">OAuth</span>
      <Switch>
        <Match when={loggingIn()}>
          <div class="flex space-x-4 items-center">
            <p>Logging in...</p>
            <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
          </div>
        </Match>
        <Match when={!loggingIn()}>
          <Button
            onClick={async () => {
              setLoggingIn(true);

              try {
                await core.oauth.authorize("streamlabs");

                if (!loggingIn()) return;
              } finally {
                setLoggingIn(false);
              }
            }}
          >
            Login
          </Button>
        </Match>
      </Switch>
    </div>
  );
};
