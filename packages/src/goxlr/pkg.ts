import { core } from "@macrograph/core";

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

export default core.createPackage<Event>({ name: "GoXLR" });
