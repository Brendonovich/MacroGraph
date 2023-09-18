import { Match, Switch } from "solid-js";
import { createForm, zodForm } from "@modular-forms/solid";
import { Button, Input } from "@macrograph/ui";
import { Ctx } from "./ctx";
import { AUTH_SCHEMA } from "./ws";

export default function (ctx: Ctx) {
  return (
    <Switch fallback="Loading...">
      <Match when={ctx.state() === "disconnected"}>
        {(_) => {
          const [form, { Form, Field }] = createForm({
            validate: zodForm(AUTH_SCHEMA),
          });

          return (
            <Form onSubmit={({ url, password }) => ctx.connect(url, password)}>
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
                        value={field.value}
                      />
                    )}
                  </Field>
                </div>
                <Button type="submit">
                  {!form.submitting ? "Connect" : "Connecting..."}
                </Button>
              </fieldset>
            </Form>
          );
        }}
      </Match>
      <Match when={ctx.state() === "connected"}>
        <div class="flex flex-row space-x-4 items-center">
          <p>Connected to OBS</p>
          <Button onClick={ctx.disconnect}>Disconnect</Button>
        </div>
      </Match>
    </Switch>
  );
}
