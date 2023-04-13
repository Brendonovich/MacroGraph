import { core } from "../models";
import { types } from "../types";

const pkg = core.createPackage({
  name: "Utils",
});

class PrintChannel {
  listeners = [] as ((d: string) => any)[];

  emit(data: string) {
    this.listeners.forEach((l) => l(data));
  }

  subscribe(cb: (d: string) => any) {
    this.listeners.push(cb);

    return () =>
      this.listeners.splice(
        this.listeners.findIndex((l) => l === cb),
        1
      );
  }
}

export const PRINT_CHANNEL = new PrintChannel();

pkg.createNonEventSchema({
  name: "Print",
  variant: "Exec",
  run({ ctx }) {
    PRINT_CHANNEL.emit(ctx.getInput<string>("input"));
  },
  generateIO(builder) {
    builder.dataInput({
      id: "input",
      name: "Input",
      type: types.string(),
    });
  },
});
