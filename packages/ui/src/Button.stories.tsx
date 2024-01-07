import { ComponentProps } from "solid-js";
import { Meta } from "storybook-solidjs";

import { Button } from "./settings";

export default {
  title: "Button",
  component: Button,
  argTypes: {},
  parameters: { backgrounds: { default: "dark" } },
  args: { children: "Button" },
} satisfies Meta<ComponentProps<typeof Button>>;

export const Primary = () => {
  return <Button>Click Me!</Button>;
};
