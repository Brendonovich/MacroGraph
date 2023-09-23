import { Button, Input } from "@macrograph/ui";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Switch } from "solid-js";
import { z } from "zod";

import { Ctx } from "./ctx";

const Schema = z.object({
  port: z.number(),
});

export default function (ctx: Ctx) {
  return (
    <Switch>
      <Match
        when={
          (ctx.state.type === "Stopped" || ctx.state.type === "Starting") &&
          ctx.state
        }
      >
        {(state) => {
          const [, { Form, Field }] = createForm({
            validate: zodForm(Schema),
            initialValues: {
              port: 1880,
            },
          });

          return (
            <Form
              onSubmit={(d) => {
                ctx.startServer(d.port);
              }}
            >
              <fieldset
                class="flex flex-row space-x-4"
                disabled={state().type === "Starting"}
              >
                <Field name="port" type="number">
                  {(field, props) => <Input {...props} value={field.value} />}
                </Field>
                <Button type="submit">
                  {state().type === "Stopped"
                    ? "Start Server"
                    : "Starting Server..."}
                </Button>
              </fieldset>
            </Form>
          );
        }}
      </Match>
      <Match when={ctx.state.type === "Running" && ctx.state}>
        {(state) => (
          <div>
            <p>WebSocket server running</p>
            <p>No Streamdeck connected</p>
            <Button onClick={state().stop}>Stop Server</Button>
          </div>
        )}
      </Match>
    </Switch>
  );
}
