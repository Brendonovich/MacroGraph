import { z } from "zod";
import { createForm, zodForm } from "@modular-forms/solid";
import { discord } from "@macrograph/packages";
import { createSignal, Match, Show, Switch } from "solid-js";
import { Button, Input } from "./ui";
import { None, Some } from "@macrograph/core";

const Schema = z.object({
  botToken: z.string(),
});

const Bot = () => {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Bot</span>
      <Switch fallback="Loading...">
        <Match when={discord.auth.botToken().isNone()}>
          {(_) => {
            const [, { Form, Field }] = createForm({
              initialValues: {
                botToken: discord.auth.botToken().unwrapOr(""),
              },
              validate: zodForm(Schema),
            });

            return (
              <Form
                onSubmit={(d) => discord.auth.setBotToken(Some(d.botToken))}
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
        <Match when={discord.bot()}>
          {(bot) => (
            <>
              <div class="flex flex-row items-center space-x-4">
                <p>{bot().username}</p>
                <Button onClick={() => discord.auth.setBotToken(None)}>
                  Log Out
                </Button>
              </div>
              <div class="flex flex-row items-center space-x-4">
                <p>
                  {`Gateway
                    ${discord.gateway
                      .ws()
                      .and(Some("Connected"))
                      .unwrapOr("Disconnected")}`}
                </p>
                <Show
                  when={!discord.gateway.ws()}
                  fallback={
                    <Button onClick={discord.gateway.disconnect}>
                      Disconnect
                    </Button>
                  }
                >
                  {(_) => {
                    const [loading, setLoading] = createSignal(false);

                    return (
                      <Button
                        disabled={loading()}
                        onClick={async () => {
                          setLoading(true);

                          discord.gateway
                            .connect()
                            .finally(() => setLoading(false));
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
};

export default () => {
  return (
    <>
      <Bot />
      {/* TODO: Personal Accs */}
    </>
  );
};
