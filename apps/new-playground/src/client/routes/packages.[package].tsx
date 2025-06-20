import { Option } from "effect";
import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { useProjectRuntime, useProjectService } from "../AppRuntime";
import { PackagesSettings } from "../Packages/PackagesSettings";
import { Dynamic } from "solid-js/web";

export default function () {
  const params = useParams<{ package: string }>();

  const projectRuntime = useProjectRuntime();
  const packagesSettings = useProjectService(PackagesSettings);

  return (
    <Show
      when={Option.getOrUndefined(packagesSettings.getPackage(params.package))}
      keyed
    >
      {(settings) => {
        const [state] = createResource(() =>
          settings.state.get().pipe(projectRuntime.runPromise),
        );

        return (
          <Show when={state()}>
            {(s) => (
              <Dynamic
                component={settings.SettingsUI}
                rpc={settings.rpcClient}
                state={s()}
                globalState={{
                  auth: { state: "logged-in", userId: "" },
                  logsPanelOpen: false,
                }}
              />
            )}
          </Show>
        );
      }}
    </Show>
  );
}
