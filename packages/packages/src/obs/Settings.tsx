import { For, Match, Switch } from "solid-js";
import { createForm, reset, zodForm } from "@modular-forms/solid";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from "./ctx";
import { AUTH_SCHEMA } from "./ws";

export default function (ctx: Ctx) {
  const [form, { Form, Field }] = createForm({
    validate: zodForm(AUTH_SCHEMA),
    initialValues: { url: "" },
  });

  return (
    <>
      <Switch>
        <Match when={ctx.instances.size !== 0}>
          <table class="mb-4 table-auto w-full">
            <thead>
              <tr>
                <th class="pr-2 text-left">IP Address</th>
                <th class="pr-2 text-left">State</th>
              </tr>
            </thead>
            <For each={[...ctx.instances]}>
              {([ip, instance]) => (
                <tr>
                  <td>
                    <span>{ip}</span>
                  </td>
                  <td>
                    <Switch>
                      <Match when={instance.state === "connected" && instance}>
                        Connected
                      </Match>
                      <Match when={instance.state === "connecting"}>
                        Connecting
                      </Match>
                      <Match when={instance.state === "disconnected"}>
                        <span class="mr-4">Disconnected</span>
                        <Button onClick={() => ctx.connectInstance(ip)}>
                          Connect
                        </Button>
                      </Match>
                    </Switch>
                  </td>
                  <td>
                    <Button onClick={() => ctx.removeInstance(ip)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              )}
            </For>
          </table>
        </Match>
      </Switch>
      <Form
        onSubmit={({ url, password }) => {
          ctx.addInstance(url, password);
          reset(form);
        }}
      >
        <fieldset disabled={form.submitting} class="space-y-4">
          <div class="space-x-4">
            <Field name="url">
              {(field, props) => (
                <Input
                  {...props}
                  placeholder="URL"
                  required
                  value={field.value}
                />
              )}
            </Field>
            <Field name="password">
              {(field, props) => (
                <Input
                  {...props}
                  placeholder="Password"
                  type="Password"
                  value={field.value ?? ""}
                />
              )}
            </Field>
          </div>
          <Button type="submit">
            {!form.submitting ? "Connect" : "Connecting..."}
          </Button>
        </fieldset>
      </Form>
    </>
  );
}
