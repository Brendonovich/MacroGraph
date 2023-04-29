import { Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core } from "@macrograph/core";
import { createUIStore, UIStoreProvider } from "./UIStore";
import { PrintOutput } from "./components/PrintOutput";
import { URL } from "./URL";

function App() {
  const ui = createUIStore();
  const graph = core.createGraph();
  ui.setCurrentGraph(graph);
  let AT = localStorage.getItem("TwitchAccessToken");
  console.log(AT);
  let hash = null;
  if(!AT) {
     hash = new URLSearchParams(window.location.hash.substring(1));
     console.log("test");
    if(hash.get("access_token") !== null){
      fetch("https://api.twitch.tv/helix/users", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + hash.get("access_token"),
            "Client-Id": "wg8e35ddq28vfzw2jmu6c661nqsjg2",

        }
        }).then(res => res.json())
            .then(res => {
              console.log(res);
              localStorage.setItem("TwitchAccessToken", hash.get("access_token"));
              localStorage.setItem("AuthedUserName", res.data[0].login);
              localStorage.setItem("AuthedUserId", res.data[0].id);
    })
  }
  }

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
          <Show when={!AT}>
          <a href={URL}>LOGIN</a>
            </Show>
            <Show when={AT}>
          <div onclick={(e) => localStorage.removeItem("TwitchAccessToken")}>LOGOUT</div>
            </Show>
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
