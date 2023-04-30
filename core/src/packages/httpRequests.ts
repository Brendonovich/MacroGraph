import { core } from "../models";
import { types } from "../types";

const pkg = core.createPackage<any>({ name: "HTTP Requests" });

pkg.createNonEventSchema({
  name: "GET",
  variant: "Exec",
  async run({ ctx }) {
    const response = await fetch(ctx.getInput<string>("url"));

    // TODO: Change when Objects implemented
    const text = await response.text();
    ctx.setOutput("response", text);
    ctx.setOutput("status", response.status);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    builder.dataOutput({
      id: "response",
      name: "Response",
      type: types.string(),
    });
    builder.dataOutput({
      id: "status",
      name: "Status",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "POST",
  variant: "Exec",
  async run({ ctx }) {
    const response = await fetch(ctx.getInput<string>("url"), {
      method: "POST",
      body: ctx.getInput<string>("body"),
      headers: {
        "content-type": "application/json; charset=UTF-8",
      },
    });

    // TODO: Change when Objects implemented
    const text = await response.text();
    ctx.setOutput("response", text);
    ctx.setOutput("status", response.status);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    builder.dataInput({
      id: "body",
      name: "Body",
      type: types.string(),
    });
    builder.dataOutput({
      id: "response",
      name: "Response",
      type: types.string(),
    });
    builder.dataOutput({
      id: "status",
      name: "Status",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "PUT",
  variant: "Exec",
  async run({ ctx }) {
    const response = await fetch(ctx.getInput<string>("url"), {
      method: "PUT",
      body: ctx.getInput<string>("body"),
      headers: {
        "content-type": "application/json; charset=UTF-8",
      },
    });

    // TODO: Change when Objects implemented
    const text = await response.text();
    ctx.setOutput("response", text);
    ctx.setOutput("status", response.status);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    builder.dataInput({
      id: "body",
      name: "Body",
      type: types.string(),
    });
    builder.dataOutput({
      id: "response",
      name: "Response",
      type: types.string(),
    });
    builder.dataOutput({
      id: "status",
      name: "Status",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "DELETE",
  variant: "Exec",
  async run({ ctx }) {
    const response = await fetch(ctx.getInput<string>("url"), {
      method: "DELETE",
    });

    // TODO: Change when Objects implemented
    const text = await response.text();
    ctx.setOutput("response", text);
    ctx.setOutput("status", response.status);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    builder.dataOutput({
      id: "status",
      name: "Status",
      type: types.int(),
    });
  },
});
