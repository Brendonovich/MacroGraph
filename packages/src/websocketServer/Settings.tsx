import { Button, Input } from "@macrograph/ui";
import { createForm, zodForm } from "@modular-forms/solid";
import { For, Match, Switch } from "solid-js";
import { z } from "zod";

import { Ctx } from "./ctx";

export default ({ websockets, startServer, stopServer }: Ctx) => {
  return (
    <>
      <Switch>
        <Match when={websockets.size !== 0}>
          <table class="mb-2 table-auto w-full">
            <thead>
              <tr>
                <th class="pr-2 text-left">IP Address</th>
                <th class="pr-2 text-left">State</th>
              </tr>
            </thead>
            <For each={[...websockets.entries()]}>
              {([key, value]) => {
                return (
                  <tr>
                    <td>
                      <span>{key}</span>
                    </td>
                    <td>
                      <span>{value.client_count}</span>
                    </td>
                    <td>
                      <Button onClick={() => stopServer(key)}>Remove</Button>
                    </td>
                  </tr>
                );
              }}
            </For>
          </table>
        </Match>
      </Switch>
      {(_) => {
        const [, { Form, Field }] = createForm({
          initialValues: {
            port: 1890,
          },
        });

        return (
          <Form
            onSubmit={(d) => startServer(d.port)}
            class="flex flex-row space-x-4"
          >
            <Field name="port" type="number">
              {(field, props) => (
                <Input {...props} value={field.value} type="number" />
              )}
            </Field>
            <Button type="submit">Submit</Button>
          </Form>
        );
      }}
    </>
  );
};
