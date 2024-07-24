import clsx from "clsx";

interface Props {
  value: boolean;
  onChange(value: boolean): void;
  class?: string;
}

export const CheckBox = (props: Props) => {
  return (
    <label class={clsx("w-4 h-4 cursor-pointer relative block", props.class)}>
      <input
        type="checkbox"
        onChange={(e) => props.onChange(e.target.checked)}
        checked={props.value}
        class={clsx("absolute opacity-0 w-0 h-0 peer")}
      />
      <span class="absolute inset-0 peer-checked:bg-[#0075FF] peer-checked:border-[#0075FF] bg-white border-white rounded border peer-focus-visible:ring-2 ring-mg-focus" />
      <svg
        viewBox="0 0 13 10"
        fill="transparent"
        class="absolute w-3 h-3 top-0.5 left-0.5"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M1.5 5.5L4.5 8.5L10.5 1.5" stroke="white" stroke-width="2" />
      </svg>
    </label>
  );
};
