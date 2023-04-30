import { createResource, Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import { URL } from "./URL";

const TWITCH_ACCESS_TOKEN = "TwitchAccessToken";

function setupTwitch() {
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

  const graph = core.createGraph();
  ui.setCurrentGraph(graph);

  const [twitchData, twitchActions] = setupTwitch();

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
            <div class="text-neutral-100">
              <Show when={twitchData()} fallback={<a href={URL}>LOGIN</a>}>
                {(data) => (
                  <>
                    <p>Logged in as {data().userName}</p>
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
            </div>
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
