import { Button, Input } from "@macrograph/ui";
import { createForm } from "@modular-forms/solid";
import { For, Match, Switch } from "solid-js";

import { Ctx } from "./ctx";

export default ({ websockets, startServer, stopServer }: Ctx) => {
  const [, { Form, Field }] = createForm({
    initialValues: {
      port: 1890,
    },
  });

  return (
    <>
      <Switch>
        <Match when={websockets.size !== 0}>
          <table class="mb-2 table-auto w-full">
            <thead>
              <tr>
                <th class="pr-2 text-left">Port</th>
                <th class="pr-2 text-left">Clients</th>
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
                      <span>
                        {value.connections.size > 0
                          ? "Connected"
                          : "Disconnected"}
                      </span>
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
      <Form
        onSubmit={(d) => startServer(d.port)}
        class="flex flex-row space-x-4"
      >
        <Field name="port" type="number">
          {(field, props) => (
            <Input
              {...props}
              value={field.value}
              type="number"
              min={0}
              max={65535}
            />
          )}
        </Field>
        <Button type="submit">Start Server</Button>
      </Form>
    </>
  );
};
