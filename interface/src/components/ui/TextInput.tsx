import clsx from "clsx";

interface Props {
  value: string;
  onChange(v: string): void;
  class?: string;
}

export const TextInput = (props: Props) => (
  <input
    type="text"
    value={props.value}
    onKeyDown={(e) => e.stopPropagation()}
    onKeyUp={(e) => e.stopPropagation()}
    onChange={(e) => {
      e.preventDefault();
      e.stopPropagation();

      props.onChange(e.target.value);
    }}
    class={clsx(
      "w-full text-xs h-5 px-1 border border-gray-300 rounded bg-black focus:border-yellow-500 focus:ring-0",
      props.class
    )}
  />
);
