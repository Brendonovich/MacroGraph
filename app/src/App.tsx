import { createResource, createSignal, Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core, LSTokenName } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import { URL } from "./twitch";
import { addDevGraph } from "./dev";
import { z } from "zod";
import { createForm, SubmitHandler, reset } from "@modular-forms/solid";

const TWITCH_ACCESS_TOKEN = "TwitchAccessToken";

function setupTwitch() {
  //@ts-expect-error
  return createResource(
    async () => {
      const hash = new URLSearchParams(window.location.hash.substring(1));

      const accessToken = hash.get("access_token");

      if (accessToken === null) return null;

      location.hash = "";

      localStorage.setItem(TWITCH_ACCESS_TOKEN, accessToken);

      const data = await fetch("https://api.twitch.tv/helix/users", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + hash.get("access_token"),
          "Client-Id": "wg8e35ddq28vfzw2jmu6c661nqsjg2",
        },
      })
        .then((res) => res.json())
        .then((data) => ({
          userName: data.data[0].login as string,
          id: data.data[0].id as string,
        }));

      localStorage.setItem("AuthedUserName", data.userName);
      localStorage.setItem("AuthedUserId", data.id);

      return data;
    },
    {
      initialValue: localStorage.getItem(TWITCH_ACCESS_TOKEN),
    }
  );
}

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
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [twitchData, twitchActions] = setupTwitch();

  const [discordForm, { Form, Field }] = createForm<DiscordForm>({
    initialValues: {
      botToken: localStorage.getItem(LSTokenName) ?? undefined,
      serverID: localStorage.getItem("discordServerId") ?? undefined,
    },
  });

  const handleSubmit: SubmitHandler<DiscordForm> = (values, event) => {
    localStorage.setItem(LSTokenName, values.botToken);
    localStorage.setItem("discordServerId", values.serverID);
  };

  return (
    <div class="flex flex-col text-center">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen())}
        class="text-neutral-100"
      >
        CLICK HERE
      </button>
      <Show when={menuOpen()}>
        <Show
          when={twitchData()}
          fallback={
            <a
              class="ring-4 ring-black bg-purple-700 my-2 text-white"
              href={URL}
            >
              TWITCH LOGIN
            </a>
          }
        >
          {(data) => (
            <>
              <p class="ring-4 ring-black bg-purple-700 my-2 text-white">
                Logged in as {data().userName}
              </p>
              <button
                type="button"
                onclick={() => {
                  localStorage.removeItem(TWITCH_ACCESS_TOKEN);
                  twitchActions.refetch();
                }}
              >
                Logout
              </button>
            </>
          )}
        </Show>
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
