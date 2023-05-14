import { Match, Switch } from "solid-js";
import { obs } from "@macrograph/core";
import { createForm, zodForm } from "@modular-forms/solid";
import { Button, Input } from "./ui";

export default () => {
  return (
    <Switch fallback="Loading...">
      <Match when={obs.ws.state() === "disconnected"}>
        {(_) => {
          const [form, { Form, Field }] = createForm({
            validate: zodForm(obs.ws.SCHEMA),
          });

          return (
            <Form
              onSubmit={async ({ url, password }) => {
                await obs.ws.connect(url, password);
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
      <Match when={obs.ws.state() === "connected"}>
        <div class="flex flex-row space-x-4 items-center">
          <p>Connected to OBS</p>
          <Button onClick={obs.ws.disconnect}>Disconnect</Button>
        </div>
      </Match>
    </Switch>
  );
};
