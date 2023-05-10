import { createSignal, Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core, LSTokenName } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import { z } from "zod";
import { createForm, SubmitHandler } from "@modular-forms/solid";
import TwitchAuth from "./TwitchAuth";

function App() {
  const ui = createUIStore();

  core.load();
  ui.setCurrentGraph(core.graphs.get(core.graphs.keys().next().value)!);

  return (
    <UIStoreProvider store={ui}>
      <CoreProvider core={core}>
        <div
          class="w-screen h-screen flex flex-row overflow-hidden select-none"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div class="flex flex-col bg-neutral-600 w-64 shadow-2xl">
            <SettingsMenu />
            <GraphList onChange={(g) => ui.setCurrentGraph(g)} />
            <PrintOutput />
          </div>
          <Show when={ui.state.currentGraph} fallback="No Graph">
            {(graph) => <Graph graph={graph()} />}
          </Show>
        </div>
      </CoreProvider>
    </UIStoreProvider>
  );
}

export default App;

const DiscordSchema = z.object({
  botToken: z.string(),
  serverID: z.string(),
});

type DiscordForm = z.input<typeof DiscordSchema>;

function SettingsMenu() {
  const [open, setOpen] = createSignal(false);

  const [, { Form, Field }] = createForm<DiscordForm>({
    initialValues: {
      botToken: localStorage.getItem(LSTokenName) ?? undefined,
      serverID: localStorage.getItem("discordServerId") ?? undefined,
    },
  });

  const handleSubmit: SubmitHandler<DiscordForm> = (values) => {
    localStorage.setItem(LSTokenName, values.botToken);
    localStorage.setItem("discordServerId", values.serverID);
  };

  return (
    <div class="flex flex-col text-center">
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class="text-neutral-100"
      >
        Open Settings
      </button>
      <Show when={open()}>
        <TwitchAuth />
        <label class="text-white">Discord Bot:</label>
        <Form onSubmit={handleSubmit}>
          <Field name="botToken">
            {(field, props) => (
              <input
                {...props}
                type="password"
                placeholder="Bot Token"
                value={field.value}
              />
            )}
          </Field>
          <Field name="serverID">
            {(field, props) => (
              <input {...props} placeholder="Server ID" value={field.value} />
            )}
          </Field>
          <button type="submit">Submit</button>
        </Form>
      </Show>
    </div>
  );
}
