import { None, Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { Match, Switch } from "solid-js";

import { createForm } from "@tanstack/solid-form";
import type { Ctx } from "./ctx";

export default function ({ state, setKey, key }: Ctx) {
  return (
    <div class="flex flex-col space-y-2">
      <span class="text-neutral-400 font-medium">Open AI API</span>
      <Switch fallback="Loading...">
        <Match when={state().isNone()}>
          {(_) => {
            const form = createForm(() => ({
              defaultValues: { key: key().unwrapOr("") },
              onSubmit: ({ value }) => {
                setKey(Some(value.key));
              },
            }));

            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                class="flex flex-row space-x-4"
              >
                <form.Field name="key">
                  {(field) => (
                    <Input
                      onInput={(e) =>
                        field().handleChange(e.currentTarget.value)
                      }
                      onBlur={() => field().handleBlur()}
                      value={field().state.value}
                      type="password"
                      placeholder="Open AI Key"
                    />
                  )}
                </form.Field>
                <Button type="submit" class="shrink-0" size="md">
                  Submit
                </Button>
              </form>
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
}
