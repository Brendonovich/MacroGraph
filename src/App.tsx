import { Show } from "solid-js";
import { CoreProvider } from "./contexts";
import { Graph } from "~/components/Graph";
import { GraphList } from "~/components/ProjectSidebar";
import { core } from "./models";
import { createUIStore, UIStoreProvider } from "./stores";

type TestEvents = "a-pressed";

const testPackage = core.createPackage<TestEvents>({
  name: "Test Package",
});

testPackage.createSchema({
  name: "A Pressed",
  variant: "Event",
  event: "a-pressed",
  generate(builder) {
    builder.addExecOutput({
      id: "pressed",
      name: "Pressed",
    });
    builder.addExecOutput({
      id: "released",
      name: "Released",
    });
    builder.addDataOutput({
      id: "shift-pressed",
      name: "Shift Pressed",
      type: {
        variant: "primitive",
        value: "bool",
      },
    });
  },
});

testPackage.createSchema({
  name: "Print",
  variant: "Exec",
  run() {
    console.log("TODO Print");
  },
  generate(builder) {
    builder.addDataInput({
      id: "input",
      name: "Input",
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
});

testPackage.createSchema({
  name: "Branch",
  variant: "Base",
  run({ ctx, io }) {
    const execPin = io.dataInput("condition").value
      ? io.execOutput("true")
      : io.execOutput("false");

    ctx.exec(execPin);
  },
  generate(builder) {
    builder.addExecInput({
      id: "exec",
      name: "",
    });
    builder.addDataInput({
      id: "condition",
      name: "Condition",
      type: {
        variant: "primitive",
        value: "bool",
      },
    });

    builder.addExecOutput({
      id: "true",
      name: "True",
    });
    builder.addExecOutput({
      id: "false",
      name: "False",
    });
  },
});

function App() {
  const ui = createUIStore();

  const graph = core.createGraph();

  ui.setCurrentGraph(graph);

  return (
    <UIStoreProvider store={ui}>
      <CoreProvider core={core}>
        <div class="w-screen h-screen flex flex-row overflow-hidden select-none">
          <GraphList onChange={(g) => ui.setCurrentGraph(g)} />
          <Show when={ui.state.currentGraph} fallback="No Graph">
            {(graph) => <Graph graph={graph()} />}
          </Show>
        </div>
      </CoreProvider>
    </UIStoreProvider>
  );
}

export default App;
