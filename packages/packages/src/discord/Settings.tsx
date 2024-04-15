import { AsyncButton, Button, Input } from "@macrograph/ui";
import { createForm, zodForm } from "@modular-forms/solid";
import { For, Show, Suspense, Switch } from "solid-js";
import { createAsync } from "@solidjs/router";
import { z } from "zod";

import { type Ctx } from ".";
import { Match } from "solid-js";

export default function ({ core, auth, gateway }: Ctx) {
  const credentials = createAsync(() => core.getCredentials());

  const [form, { Form, Field }] = createForm({
    validate: zodForm(z.object({ botToken: z.string() })),
  });

  return (
    <div class="flex flex-col items-start space-y-2">
      <span class="text-neutral-400 font-medium">Bot</span>
      <Form onSubmit={(d) => auth.addBot(d.botToken)}>
        <fieldset class="flex flex-row space-x-4" disabled={form.submitting}>
          <Field name="botToken">
            {(field, props) => (
              <Input
                {...props}
                type="password"
                placeholder="Bot Token"
                value={field.value}
              />
            )}
          </Field>
          <Button type="submit" size="md">
            Submit
          </Button>
        </fieldset>
      </Form>

      <ul class="flex flex-col mb-2 space-y-2 w-full mt-4">
        <For each={[...auth.bots.entries()]}>
          {([token, bot]) => (
            <Show when={bot()}>
              {(bot) => {
                const gatewaySocket = () => gateway.sockets.get(bot().data.id);

                return (
                  <li class="flex flex-col items-stretch 1-full space-y-1">
                    <div class="flex flex-row justify-between items-center">
                      <span class="text-lg font-medium">
                        {bot().data.username}
                      </span>
                      <Button
                        class="ml-auto"
                        onClick={() => auth.removeBot(token)}
                      >
                        Log Out
                      </Button>
                    </div>
                    <div class="flex flex-row items-center space-x-4">
                      <Switch>
                        <Match when={gatewaySocket()}>
                          <p>Gateway Connected</p>
                          <Button
                            onClick={() =>
                              gateway.disconnectSocket(bot().data.id)
                            }
                          >
                            Disconnect
                          </Button>
                        </Match>
                        <Match when={!gatewaySocket()}>
                          <p>Gateway Disconnected</p>
                          <AsyncButton
                            onClick={() => gateway.connectSocket(bot())}
                            loadingChildren="Connecting..."
                          >
                            Connect
                          </AsyncButton>
                        </Match>
                      </Switch>
                    </div>
                  </li>
                );
              }}
            </Show>
          )}
        </For>
      </ul>

      <span class="text-neutral-400 font-medium">OAuth</span>
      <ul class="flex flex-col mb-2 space-y-2 w-full">
        <Suspense>
          <Show when={credentials()}>
            {(creds) => (
              <For each={creds().filter((cred) => cred.provider === "discord")}>
                {(cred) => {
                  const account = () => auth.accounts.get(cred.id);

                  return (
                    <li class="flex flex-row items-center justify-between 1-full">
                      <span>{cred.displayName}</span>
                      <Show
                        when={account()}
                        children={
                          <Button onClick={() => auth.disableAccount(cred.id)}>
                            Disable
                          </Button>
                        }
                        fallback={
                          <AsyncButton
                            onClick={() => auth.enableAccount(cred.id)}
                            loadingChildren="Enabling..."
                          >
                            Enable
                          </AsyncButton>
                        }
                      />
                    </li>
                  );
                }}
              </For>
            )}
          </Show>
        </Suspense>
      </ul>
    </div>
  );
}
