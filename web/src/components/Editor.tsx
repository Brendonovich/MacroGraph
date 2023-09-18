import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";
import { obs } from "@macrograph/packages";
import { onMount } from "solid-js";

export default () => {
  const core = new Core();

  onMount(() => {
    core.packages.push(obs.pkg());
  });

  return <Interface core={core} />;
};
