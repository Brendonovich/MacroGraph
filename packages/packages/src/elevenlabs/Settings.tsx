import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { Match, Switch, createSignal } from "solid-js";
import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";

import { Ctx } from "./ctx";

const Schema = z.object({
  key: z.string(),
});

export default function ({ state, setKey, key }: Ctx) {
  let [update, setUpdate] = createSignal("");

  const [, { Form, Field }] = createForm({
    initialValues: {
      key: key().unwrapOr(""),
    },
    validate: zodForm(Schema),
  });

  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Open AI API</span>
      <Form
        onSubmit={(d) => {
          setUpdate("hello");
          setKey(Some(d.key));
          setTimeout(() => {
            setUpdate("");
          }, 1000);
        }}
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
      <Switch>
        {" "}
        <Match when={update() === "hello"}>
          <span>Key Saved!</span>
        </Match>
      </Switch>
    </div>
  );
}
