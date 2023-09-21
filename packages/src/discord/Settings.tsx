import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { createSignal, Match, Show, Switch } from "solid-js";
import { None, Some } from "@macrograph/core";

import { type Ctx } from ".";
import { Button, Input } from "@macrograph/ui";

const Schema = z.object({
  botToken: z.string(),
});

export default function ({ auth, gateway, bot }: Ctx) {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Bot</span>
      <Switch fallback="Loading...">
        <Match when={auth.botToken().isNone()}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              initialValues: {
                botToken: auth.botToken().unwrapOr(""),
              },
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => auth.setBotToken(Some(d.botToken))}
                class="flex flex-row space-x-4"
              >
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
                <Button type="submit">Submit</Button>
              </Form>
            );
          }}
        </Match>
        <Match when={bot()}>
          {(bot) => (
            <>
              <div class="flex flex-row items-center space-x-4">
                <p>{bot().username}</p>
                <Button onClick={() => auth.setBotToken(None)}>Log Out</Button>
              </div>
              <div class="flex flex-row items-center space-x-4">
                <p>
                  {`Gateway
                    ${gateway
                      .ws()
                      .and(Some("Connected"))
                      .unwrapOr("Disconnected")}`}
                </p>
                <Show
                  when={!gateway.ws()}
                  fallback={
                    <Button onClick={gateway.disconnect}>Disconnect</Button>
                  }
                >
                  {(_) => {
                    const [loading, setLoading] = createSignal(false);

                    return (
                      <Button
                        disabled={loading()}
                        onClick={async () => {
                          setLoading(true);

                          gateway.connect().finally(() => setLoading(false));
                        }}
                      >
                        {loading() ? "Connecting..." : "Connect"}
                      </Button>
                    );
                  }}
                </Show>
              </div>
            </>
          )}
        </Match>
      </Switch>
    </div>
  );
}
