// import Discord from "./Discord";
// import OBS from "./OBS";
// import Twitch from "./Twitch";
// import GoXLR from "./GoXLR";
// import Streamlabs from "./Streamlabs";
import { Button, Dialog } from "./ui";
import { useUIStore } from "../UIStore";
import { useCore } from "../contexts";
import { For, ParentProps, lazy } from "solid-js";

export default () => {
  const UI = useUIStore();
  const core = useCore();

  return (
    <div class="flex flex-col items-center p2 space-y-2">
      <OpenSettings />
      <Button onclick={() => UI.copyItem(core.project)}>
        Copy to Clipboard
      </Button>
    </div>
  );
};

const OpenSettings = () => {
  const core = useCore();

  return (
    <Dialog.Root trigger={<Button>Open Settings</Button>}>
      <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
        <div class="flex flex-row justify-between text-white p-4">
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.CloseButton>X</Dialog.CloseButton>
        </div>
        <div class="flex-1 flex flex-col p-4 pt-0 w-full text-white rounded-lg max-w-2xl overflow-y-scroll">
          <div class="space-y-4">
            <For each={core.packages}>
              {(pkg) => {
                console.log(pkg);
                if (!pkg.settingsUI) return null;

                const Component = lazy(pkg.settingsUI);

                const c = <Component {...pkg.ctx} />;

                console.log(c);

                return c;
              }}
            </For>
            {/* <Section title="Twitch"> */}
            {/*   <Twitch /> */}
            {/* </Section> */}
          </div>
        </div>
      </div>
    </Dialog.Root>
  );
};

const Section = (props: { title: string } & ParentProps) => {
  return (
    <section class="bg-neutral-900 rounded-md divide-y divide-neutral-600 border border-neutral-600">
      <h3 class="p-3 font-medium text-xl">{props.title}</h3>
      <div class="p-4">{props.children}</div>
    </section>
  );
};
