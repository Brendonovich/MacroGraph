import {
  ComponentProps,
  ErrorBoundary,
  For,
  ParentProps,
  Show,
  Suspense,
  createSignal,
  startTransition,
} from "solid-js";
import { Dialog as KDialog } from "@kobalte/core";

import { Dialog } from "./ui";
import { useCore } from "../contexts";
import {
  projectToClipboardItem,
  writeClipboardItemToClipboard,
} from "../clipboard";
import { usePlatform } from "../platform";
import { createMemo } from "solid-js";

function IconContainer(props: ParentProps<ComponentProps<"div">>) {
  return (
    <div
      {...props}
      class="bg-neutral-900 rounded w-8 h-8 flex flex-col items-center justify-center p-1"
    />
  );
}

export default () => {
  const platform = usePlatform();

  return (
    <div class="flex flex-col gap-2 p-1">
      <div class="flex flex-row gap-1 text-white">
        <ConnectionsDialog>
          <KDialog.Trigger title="Connections">
            <IconContainer>
              <IconMdiConnection class="w-full h-full" />
            </IconContainer>
          </KDialog.Trigger>
        </ConnectionsDialog>
        <Show
          when={platform.projectPersistence}
          keyed
          fallback={<CopyProjectButton />}
        >
          {(projectPersistence) => (
            <>
              <button
                title="Save Project"
                onClick={(e) => projectPersistence.saveProject(e.shiftKey)}
              >
                <IconContainer>
                  <IconFaSolidSave class="w-full h-full" />
                </IconContainer>
              </button>
              <button
                title="Load Project"
                onClick={() => projectPersistence.loadProject()}
              >
                <IconContainer>
                  <IconTdesignFolderImport class="w-full h-full" />
                </IconContainer>
              </button>
            </>
          )}
        </Show>
      </div>
      <Show when={platform.projectPersistence} keyed>
        {(projectPerstence) => (
          <Show when={projectPerstence.url}>
            {(url) => (
              <div class="break-all">
                <p class="text-xs font-semibold">Project Path</p>
                <p class="text-sm font-mono">{url()}</p>
              </div>
            )}
          </Show>
        )}
      </Show>
    </div>
  );
};

function CopyProjectButton() {
  const core = useCore();

  return (
    <button
      title="Copy Project"
      onClick={() =>
        writeClipboardItemToClipboard(projectToClipboardItem(core.project))
      }
    >
      <IconContainer>
        <IconTablerClipboard class="w-full h-full" />
      </IconContainer>
    </button>
  );
}

export function ConnectionsDialog(props: ParentProps) {
  const core = useCore();

  const [open, setOpen] = createSignal(false);

  const packages = createMemo(() =>
    core.packages
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !!p.SettingsUI)
  );

  const [selectedPackage, setSelectedPackage] = createSignal(packages()[0]);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open()} trigger={props.children}>
      <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden w-full max-w-2xl min-w-[40rem] divide-y divide-black border border-black">
        <div class="flex flex-row justify-between text-white p-4">
          <Dialog.Title class="font-bold text-2xl">Connections</Dialog.Title>
          <Dialog.CloseButton>
            <IconBiX class="w-8 h-8" />
          </Dialog.CloseButton>
        </div>
        <div class="flex flex-row divide-x divide-black">
          <ul>
            <For each={packages()}>
              {(pkg) => (
                <li>
                  <button
                    onClick={() =>
                      startTransition(() => setSelectedPackage(pkg))
                    }
                    class={"p-2 w-full h-full text-left"}
                    classList={{ "bg-black": selectedPackage() === pkg }}
                  >
                    {pkg.name}
                  </button>
                </li>
              )}
            </For>
          </ul>
          <div class="flex-1 flex flex-col p-4 w-full text-white">
            <ErrorBoundary
              fallback={(error: Error) => (
                <div>
                  <p>An error occurred:</p>
                  <p>{error.message}</p>
                </div>
              )}
            >
              <Suspense fallback="Loading">
                <div>
                  <Show when={selectedPackage()?.SettingsUI} keyed>
                    {(UI) => <UI {...selectedPackage()?.ctx} />}
                  </Show>
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </Dialog.Root>
  );
}

const Section = (props: { title: string } & ParentProps) => {
  return (
    <section class="bg-neutral-900 rounded-md divide-y divide-neutral-600 border border-neutral-600">
      <h3 class="p-3 font-medium text-xl">{props.title}</h3>
      <div class="p-4">{props.children}</div>
    </section>
  );
};
