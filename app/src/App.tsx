import { createSignal, Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { Message, core, LSTokenName, rspcClient } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import { z } from "zod";
import { createForm, SubmitHandler } from "@modular-forms/solid";

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

const TWITCH_ACCESS_TOKEN = "TwitchAccessToken";

const TwitchAuth = () => {
  const [token, setToken] = createSignal(
    localStorage.getItem(TWITCH_ACCESS_TOKEN)
  );

  const [authState, setAuthState] = createSignal<Message | null>(null);

  const doAuth = () => {
    rspcClient.addSubscription(["auth.twitch", null as any], {
      onData: (m) => {
        if (typeof m === "object" && "Received" in m) {
          setToken(m.Received);
          localStorage.setItem(TWITCH_ACCESS_TOKEN, m.Received);

          setAuthState(null);
        }
      },
      onStarted: () => setAuthState("Listening"),
      onError: () => setAuthState(null),
    });
  };

  return (
    <Show
      when={token()}
      fallback={
        <Show
          when={authState() !== null}
          fallback={
            <button
              class="ring-4 ring-black bg-purple-700 my-2 text-white"
              onClick={doAuth}
            >
              TWITCH LOGIN
            </button>
          }
        >
          <p>Logging in...</p>
        </Show>
      }
    >
      <p>Logged Into Twitch</p>
      {/* <p class="ring-4 ring-black bg-purple-700 my-2 text-white"> */}
      {/*   Logged in as {data().userName} */}
      {/* </p> */}
      <button
        type="button"
        onclick={() => {
          localStorage.removeItem(TWITCH_ACCESS_TOKEN);
          setToken(null);
        }}
      >
        Logout
      </button>
    </Show>
  );
};
