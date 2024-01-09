import {
  ComponentProps,
  ErrorBoundary,
  For,
  ParentProps,
  Show,
  Suspense,
  createSignal,
} from "solid-js";

import { Dialog } from "./ui";
import { useCore } from "../contexts";
import {
  projectToClipboardItem,
  writeClipboardItemToClipboard,
} from "../clipboard";
import { usePlatform } from "../platform";

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
        <OpenSettingsDialog>
          <IconContainer title="Settings">
            <IconTablerSettings class="w-full h-full" />
          </IconContainer>
        </OpenSettingsDialog>
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
                  <IconMaterialSymbolsFileOpenOutline class="w-full h-full" />
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

function OpenSettingsDialog(props: ParentProps) {
  const core = useCore();

  const [open, setOpen] = createSignal(false);

  return (
    <Dialog.Root onOpenChange={setOpen} open={open()} trigger={props.children}>
      <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden w-full max-w-2xl min-w-[40rem]">
        <div class="flex flex-row justify-between text-white p-4">
          <Dialog.Title class="font-bold text-2xl">Settings</Dialog.Title>
          <Dialog.CloseButton>
            <IconBiX class="w-8 h-8" />
          </Dialog.CloseButton>
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
                          <p>An error occurred:</p>
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
}

const Section = (props: { title: string } & ParentProps) => {
  return (
    <section class="bg-neutral-900 rounded-md divide-y divide-neutral-600 border border-neutral-600">
      <h3 class="p-3 font-medium text-xl">{props.title}</h3>
      <div class="p-4">{props.children}</div>
    </section>
  );
};
