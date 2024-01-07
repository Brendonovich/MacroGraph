import { ComponentProps, JSXElement, ParentProps } from "solid-js";
import { Dialog as KobalteDialog } from "@kobalte/core";

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

export const DialogRoot = (props: ParentProps<{ trigger: JSXElement }>) => {
  return (
    <KobalteDialog.Root>
      <KobalteDialog.Trigger as="div">{props.trigger}</KobalteDialog.Trigger>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="absolute inset-0 bg-black/40" />
        <KobalteDialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden">
          {props.children}
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
