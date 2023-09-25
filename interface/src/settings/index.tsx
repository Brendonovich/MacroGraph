import {
  ErrorBoundary,
  For,
  ParentProps,
  Suspense,
  createSignal,
} from "solid-js";

import { Button, Dialog } from "./ui";
import { useUIStore } from "../UIStore";
import { useCore } from "../contexts";

export default () => {
  const UI = useUIStore();
  const core = useCore();

  return (
    <div class="flex flex-col items-center p-2 space-y-2">
      <OpenSettings />
      <Button onclick={() => UI.copyItem(core.project)}>
        Copy to Clipboard
      </Button>
    </div>
  );
};

const OpenSettings = () => {
  const core = useCore();

  const [open, setOpen] = createSignal(false);

  return (
    <Dialog.Root
      onOpenChange={setOpen}
      open={open()}
      trigger={<Button>Open Settings</Button>}
    >
      <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden w-full max-w-2xl">
        <div class="flex flex-row justify-between text-white p-4">
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.CloseButton>X</Dialog.CloseButton>
        </div>
        <div class="flex-1 flex flex-col p-4 pt-0 w-full text-white rounded-lg overflow-y-scroll">
          <div class="space-y-4">
            <For
              each={core.packages.sort((a, b) => a.name.localeCompare(b.name))}
            >
              {(pkg) => {
                if (!pkg.SettingsUI) return null;

                return (
                  <Section title={pkg.name}>
                    <ErrorBoundary
                      fallback={(error: Error) => (
                        <div>
                          <p>{error.message}</p>
                        </div>
                      )}
                    >
                      <Suspense fallback="Loading">
                        <pkg.SettingsUI {...pkg.ctx} />
                      </Suspense>
                    </ErrorBoundary>
                  </Section>
                );
              }}
            </For>
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
