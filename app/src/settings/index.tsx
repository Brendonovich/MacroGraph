import { Dialog } from "@kobalte/core";
import { ParentProps } from "solid-js";
import Discord from "./Discord";
import OBS from "./OBS";
import Twitch from "./Twitch";
import { Button } from "./ui";
import { core } from "@macrograph/core";
import { useUIStore } from "~/UIStore";
import GoXLR from "./GoXLR";
import Streamlabs from "./Streamlabs";

export default () => {
  const UI = useUIStore();

  return (
    <div class="flex flex-col items-center p2 space-y-2">
      <SettingsDialog />
      <Button onclick={() => UI.copyItem(core.project)}>
        Copy to Clipboard
      </Button>
    </div>
  );
};

const SettingsDialog = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger as="div">
        <Button>Open Settings</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="absolute inset-0 bg-black/40" />
        <Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden">
          <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
            <div class="flex flex-row justify-between text-white p-4">
              <Dialog.Title>Settings</Dialog.Title>
              <Dialog.CloseButton>X</Dialog.CloseButton>
            </div>
            <div class="flex-1 flex flex-col p-4 pt-0 w-full text-white rounded-lg max-w-2xl overflow-y-scroll">
              <div class="space-y-4">
                <Section title="Twitch">
                  <Twitch />
                </Section>
                <Section title="Discord">
                  <Discord />
                </Section>
                <Section title="OBS">
                  <OBS />
                </Section>
                <Section title="Streamlabs">
                  <Streamlabs />
                </Section>
                <Section title="GoXLR">
                  <GoXLR />
                </Section>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
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
