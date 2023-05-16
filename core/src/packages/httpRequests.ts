import { rspcClient } from "../client";
import { core } from "../models";
import { types } from "../types";

const pkg = core.createPackage<any>({ name: "HTTP Requests" });

pkg.createNonEventSchema({
  name: "GET",
  variant: "Exec",
  async run({ ctx }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput<string>("url"),
        method: "GET",
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput("response", response);
    // ctx.setOutput("status", response);
  },
  generateIO(t) {
    return {
      inputs: {
        url: t.dataInput({
          id: "url",
          name: "URL",
          type: types.string(),
        }),
      },
      outputs: {
        response: t.dataOutput({
          id: "response",
          name: "Response",
          type: types.string(),
        }),
        status: t.dataOutput({
          id: "status",
          name: "Status",
          type: types.int(),
        }),
      },
    };
  },
});

pkg.createNonEventSchema({
  name: "POST",
  variant: "Exec",
  async run({ ctx }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput<string>("url"),
        method: "POST",
        body: {
          Json: ctx.getInput<string>("body"),
        },
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput("response", response.data);
    ctx.setOutput("status", response.status);
  },
  generateIO(t) {
    t.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    t.dataInput({
      id: "body",
      name: "Body",
      type: types.string(),
    });
    t.dataOutput({
      id: "response",
      name: "Response",
      type: types.string(),
    });
    t.dataOutput({
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
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput<string>("url"),
        method: "PUT",
        body: {
          Json: ctx.getInput<string>("body"),
        },
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput("response", response.data);
    ctx.setOutput("status", response.status);
  },
  generateIO(t) {
    t.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    t.dataInput({
      id: "body",
      name: "Body",
      type: types.string(),
    });
    t.dataOutput({
      id: "response",
      name: "Response",
      type: types.string(),
    });
    t.dataOutput({
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
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput<string>("url"),
        method: "DELETE",
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput("response", response.data);
    ctx.setOutput("status", response.status);
  },
  generateIO(t) {
    t.dataInput({
      id: "url",
      name: "URL",
      type: types.string(),
    });
    t.dataOutput({
      id: "status",
      name: "Status",
      type: types.int(),
    });
  },
});
