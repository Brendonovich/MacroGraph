import { Dialog } from "@kobalte/core";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";
import {
  For,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
} from "solid-js";
import { Accessor } from "solid-js";
import { useCoreContext } from "../../contexts";

export function createSection(args: {
  title: string;
  source: Accessor<Array<{ title: string; run(control: Control): void }>>;
}) {
  return args;
}

export type Section = ReturnType<typeof createSection>;

function createControl() {
  const [root, setRoot] = createSignal<HTMLDivElement>();
  const [open, setOpen] = createSignal(false);
  const [input, setInput] = createSignal("");

  const control = {
    get root() {
      const r = root();
      if (!r) throw new Error("Root not set");
      return r;
    },
    setRoot,
    open,
    setOpen,
    show() {
      batch(() => {
        setOpen(true);
        setInput("");
      });
      control.input().focus();
      control.setActive(control.actions()[0]);
    },
    hide() {
      control.input().blur();
      setOpen(false);
    },
    input() {
      return control.root.querySelector("input") as HTMLInputElement;
    },
    inputValue: input,
    setInput,
    actions() {
      return [
        ...(control.root.querySelectorAll("[data-element='action']") ?? []),
      ];
    },
    active() {
      return root()?.querySelector("[data-element='action'].active") as
        | HTMLElement
        | undefined;
    },
    setActive(el?: Element) {
      if (!el) return;

      const current = control.active();
      if (current) current.classList.remove("active");

      el.classList.add("active");

      const index = control.actions().indexOf(el);
      if (index === 0) {
        el.scrollIntoView({
          block: "end",
        });
        return;
      }

      el.scrollIntoView({
        block: "nearest",
      });
    },
    move(direction: -1 | 1) {
      const current = control.active();
      const all = control.actions();
      if (!current) {
        control.setActive(all[0]);
        return;
      }
      const index = all.indexOf(current);
      const next = all[index + direction];
      control.setActive(next ?? all[direction == 1 ? 0 : all.length - 1]);
    },
    next() {
      return control.move(1);
    },
    back() {
      return control.move(-1);
    },
  };

  return control;
}

export type Control = ReturnType<typeof createControl>;

export function CommandDialog(props: { sections: Section[] }) {
  const control = createControl();

  createEventListener(window, "keydown", (e) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      if (control.open()) control.hide();
      else control.show();
    }
  });

  createEventListener(window, "keydown", (e) => {
    if (!control.open()) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      control.back();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      control.next();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const current = control.active();
      if (current) current.click();
    }
  });

  const sections = createMemo(() => {
    const tokenisedInputValue = control.inputValue().toLowerCase().split(" ");

    return props.sections
      .map((section) => {
        return {
          section,
          sources: section.source().filter((i) => {
            const tokenisedTitle = i.title.toLowerCase().split(" ");
            return tokenisedInputValue.every((t) =>
              tokenisedTitle.some((i) => i.includes(t))
            );
          }),
        };
      })
      .filter((s) => s.sources.length > 0);
  });

  createEffect(
    on(sections, () => {
      if (control.open()) control.setActive(control.actions()[0]);
    })
  );

  const ctx = useCoreContext();

  return (
    <Dialog.Root open={control.open()} onOpenChange={control.setOpen}>
      <Dialog.Portal mount={ctx.rootRef()}>
        <div class="fixed inset-0 flex flex-col items-center overflow-hidden z-100 pt-48 px-8">
          <Dialog.Content
            ref={control.setRoot}
            style={{ "box-shadow": "rgba(0, 0, 0, 0.5) 0px 16px 70px" }}
            class={clsx(
              "max-w-2xl w-full backdrop-blur-md bg-black/80 min-h-[24rem] max-h-[32rem] rounded-lg shadow-2xl overflow-hidden flex flex-col divide-y divide-neutral-800 outline-none duration-75",
              "ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-[0.98]",
              "ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-[0.98]"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const current = control.active();
                if (current) current.click();
              } else {
                return;
              }

              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              if (control.root.contains(e.target)) {
                if (control.open()) control.hide();
              }
            }}
          >
            <input
              placeholder="Type a command or search..."
              type="text"
              class="w-full p-4 bg-transparent border-none text-white text-lg placeholder:text-white/40"
              value={control.inputValue()}
              onInput={(e) => control.setInput(e.target.value)}
            />
            <div class="w-full flex-1 p-2 space-y-2 text-sm text-white overflow-y-auto">
              <For each={sections()}>
                {(section) => (
                  <div>
                    <div class="text-neutral-400 font-light text-[0.8rem] px-2 py-1">
                      {section.section.title}
                    </div>
                    <For each={section.sources}>
                      {(source) => (
                        <li
                          class="px-4 py-2 rounded flex flex-row items-center gap-2 [&.active]:bg-neutral-900"
                          onMouseOver={(e) => {
                            const target = e.currentTarget;
                            setTimeout(() => control.setActive(target), 0);
                          }}
                          onClick={() => source.run(control)}
                          data-element="action"
                        >
                          <span>{source.title}</span>
                        </li>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
