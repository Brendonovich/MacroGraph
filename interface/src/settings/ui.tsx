import {
  ComponentProps,
  JSXElement,
  ParentProps,
  createSignal,
  splitProps,
} from "solid-js";
import { Dialog as KobalteDialog } from "@kobalte/core";

import { useCoreContext } from "../contexts";
import clsx from "clsx";

export const Button = (props: ComponentProps<"button">) => (
  <button
    {...props}
    class="bg-white disabled:bg-neutral-300 text-black py-1 px-4 rounded text-sm"
    type={props.type ?? "button"}
  >
    {props.children}
  </button>
);

export const Input = (props: ComponentProps<"input">) => (
  <input
    {...props}
    type={props.type ?? "text"}
    class="text-white bg-black placeholder:text-white/60 rounded border-neutral-500"
  />
);

export const DialogRoot = (
  props: ParentProps<{ trigger: JSXElement }> &
    ComponentProps<typeof KobalteDialog.Root>
) => {
  const ctx = useCoreContext();

  const [otherProps, rootProps] = splitProps(props, ["trigger", "children"]);

  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <KobalteDialog.Root open={isOpen()} onOpenChange={setIsOpen} {...rootProps}>
      <KobalteDialog.Trigger as="div">
        {otherProps.trigger}
      </KobalteDialog.Trigger>
      <KobalteDialog.Portal mount={ctx.rootRef()}>
        <KobalteDialog.Overlay
          class={clsx(
            "absolute inset-0 bg-black/50 backdrop-blur-sm focus:outline-none",
            "ui-expanded:animate-in ui-expanded:fade-in-0",
            "ui-not-expanded:animate-out ui-expanded:fade-out-0"
          )}
        />
        <KobalteDialog.Content
          class={clsx(
            "absolute inset-0 flex flex-col items-center py-10 overflow-hidden duration-200",
            "ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-[0.98]",
            "ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-[0.98]"
            // "ui-not-expanded:slide-out-to-left-1/2 ui-not-expanded:slide-out-to-top-[48%] ui-expanded:slide-in-from-left-1/2 ui-expanded:slide-in-from-top-[48%]"
          )}
        >
          {otherProps.children}
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog.Root>
  );
};

export const Dialog = {
  Root: DialogRoot,
  Title: KobalteDialog.Title,
  CloseButton: KobalteDialog.CloseButton,
};
