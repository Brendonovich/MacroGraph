import { createPackage } from "@macrograph/core";

type Event = {
  levelsChange: {
    channel: string;
    value: number;
  };
  buttonDown: {
    buttonName: string;
    state: boolean;
  };
  faderStatus: {
    channel: string;
    state: boolean;
  };
};

export const pkg = createPackage<Event>({ name: "GoXLR" });
