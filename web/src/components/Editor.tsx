import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";
import {
  obs,
  keyboard,
  json,
  list,
  utils,
  twitch,
  logic,
  streamlabs,
  goxlr,
  map,
  localStorage,
} from "@macrograph/packages";
import { onMount } from "solid-js";

export default () => {
  const core = new Core();

  onMount(() => {
    core.registerPackage(obs.pkg());
    core.registerPackage(keyboard.pkg());
    core.registerPackage(json.pkg());
    core.registerPackage(list.pkg());
    core.registerPackage(utils.pkg());
    core.registerPackage(twitch.pkg());
    core.registerPackage(logic.pkg());
    core.registerPackage(streamlabs.pkg());
    core.registerPackage(goxlr.pkg());
    core.registerPackage(map.pkg());
    core.registerPackage(localStorage.pkg());
  });

  return <Interface core={core} />;
};
