import { Option } from "effect";
import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { useAppRuntime } from "../AppRuntime";
import { PackagesSettings } from "../Packages/PackagesSettings";
import { Dynamic } from "solid-js/web";

export default function () {
  const params = useParams<{ package: string }>();

  const appRuntime = useAppRuntime();
  const packagesSettings = PackagesSettings.pipe(appRuntime.runSync);

  return (
    <Show
      when={Option.getOrUndefined(packagesSettings.getPackage(params.package))}
      keyed
    >
      {(settings) => {
        const [state] = createResource(() =>
          settings.state.get().pipe(appRuntime.runPromise),
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

  // const PackageSettings = getPackage(pkg).Settings;

  // const [settings, settingsActions] = createResource(
  //   () =>
  //     rpcClient.GetPackageSettings({ package: pkg }).pipe(Effect.runPromise),
  //   { storage: createDeepSignal },
  // );

  // Effect.gen(function* () {
  //   const s = yield* eventPubSub.subscribe;

  //   yield* Stream.fromQueue(s).pipe(
  //     Stream.runForEach((s) =>
  //       Effect.gen(function* () {
  //         if (s.package === pkg) {
  //           const newValue = yield* rpcClient.GetPackageSettings({
  //             package: pkg,
  //           });
  //           settingsActions.mutate(reconcile(newValue));
  //         }
  //       }),
  //     ),
  //   );
  // }).pipe(Effect.scoped, Effect.runFork);

  // return (
  //   <Show when={settings()}>
  //     <PackageSettings
  //       rpc={getPackage(pkg).rpcClient}
  //       state={settings()}
  //       globalState={globalState}
  //     />
  //   </Show>
  // );
}
