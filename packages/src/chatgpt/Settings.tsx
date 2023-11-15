import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Switch } from "solid-js";
import { None, Some } from "@macrograph/core";
import { Ctx } from "./ctx";
import { Button, Input } from "@macrograph/ui";

const Schema = z.object({
  key: z.string(),
});

export default ({ state, setKey, key }: Ctx) => {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Open AI API</span>
      <Switch fallback="Loading...">
        <Match when={state().isNone()}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              initialValues: {
                key: key().unwrapOr(""),
              },
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => setKey(Some(d.key))}
                class="flex flex-row space-x-4"
              >
                <Field name="key">
                  {(field, props) => (
                    <Input
                      {...props}
                      type="password"
                      placeholder="Open AI Key"
                      value={field.value}
                    />
                  )}
                </Field>
                <Button type="submit">Submit</Button>
              </Form>
            );
          }}
        </Match>
        <Match when={state().isSome()}>
          <div class="flex flex-row items-center space-x-4">
            <Button onClick={() => setKey(None)}>Disconnect</Button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
