import { core } from "~/models";

const pkg = core.createPackage({
  name: "Utils",
});

pkg.createSchema({
  name: "Print",
  variant: "Exec",
  run({ ctx }) {
    console.log(ctx.getInput<string>("input"));
  },
  generateIO(builder) {
    console.log("bruh?");
    builder.dataInput({
      id: "input",
      name: "Input",
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
});
