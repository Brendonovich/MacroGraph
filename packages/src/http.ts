import { createPackage, t } from "@macrograph/core";
import { rspcClient } from "./rspcClient";

export const pkg = createPackage<any>({ name: "HTTP Requests" });

pkg.createNonEventSchema({
  name: "GET",
  variant: "Exec",
  generateIO(io) {
    return {
      url: io.dataInput({
        id: "url",
        name: "URL",
        type: t.string(),
      }),
      response: io.dataOutput({
        id: "response",
        name: "Response",
        type: t.string(),
      }),
      status: io.dataOutput({
        id: "status",
        name: "Status",
        type: t.int(),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput(io.url),
        method: "GET",
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput(io.response, response.data);
    ctx.setOutput(io.status, response.status);
  },
});

pkg.createNonEventSchema({
  name: "POST",
  variant: "Exec",
  generateIO(io) {
    return {
      url: io.dataInput({
        id: "url",
        name: "URL",
        type: t.string(),
      }),
      body: io.dataInput({
        id: "body",
        name: "Body",
        type: t.string(),
      }),
      response: io.dataOutput({
        id: "response",
        name: "Response",
        type: t.string(),
      }),
      status: io.dataOutput({
        id: "status",
        name: "Status",
        type: t.int(),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput(io.url),
        method: "POST",
        body: {
          Json: ctx.getInput(io.body),
        },
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput(io.response, response.data);
    ctx.setOutput(io.status, response.status);
  },
});

pkg.createNonEventSchema({
  name: "PUT",
  variant: "Exec",
  generateIO(io) {
    return {
      url: io.dataInput({
        id: "url",
        name: "URL",
        type: t.string(),
      }),
      body: io.dataInput({
        id: "body",
        name: "Body",
        type: t.string(),
      }),
      response: io.dataOutput({
        id: "response",
        name: "Response",
        type: t.string(),
      }),
      status: io.dataOutput({
        id: "status",
        name: "Status",
        type: t.int(),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput(io.url),
        method: "PUT",
        body: {
          Json: ctx.getInput(io.body),
        },
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput(io.response, response.data);
    ctx.setOutput(io.status, response.status);
  },
});

pkg.createNonEventSchema({
  name: "DELETE",
  variant: "Exec",
  generateIO(io) {
    return {
      url: io.dataInput({
        id: "url",
        name: "URL",
        type: t.string(),
      }),
      response: io.dataOutput({
        id: "response",
        name: "Response",
        type: t.string(),
      }),
      status: io.dataOutput({
        id: "status",
        name: "Status",
        type: t.int(),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await rspcClient.query([
      "http.text",
      {
        url: ctx.getInput(io.url),
        method: "DELETE",
      },
    ]);

    // TODO: Change when Objects implemented
    ctx.setOutput(io.response, response.data);
    ctx.setOutput(io.status, response.status);
  },
});
