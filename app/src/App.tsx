import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";

function App() {
  const core = new Core();

  return <Interface core={core} />;
}

export default App;
