import { core, rspcClient, t } from "@macrograph/core";

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
  generateIO(io) {
    return {
      inputs: {
        url: io.dataInput({
          id: "url",
          name: "URL",
          type: t.string(),
        }),
      },
      outputs: {
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
  generateIO(io) {
    io.dataInput({
      id: "url",
      name: "URL",
      type: t.string(),
    });
    io.dataInput({
      id: "body",
      name: "Body",
      type: t.string(),
    });
    io.dataOutput({
      id: "response",
      name: "Response",
      type: t.string(),
    });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.string(),
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
  generateIO(io) {
    io.dataInput({
      id: "url",
      name: "URL",
      type: t.string(),
    });
    io.dataInput({
      id: "body",
      name: "Body",
      type: t.string(),
    });
    io.dataOutput({
      id: "response",
      name: "Response",
      type: t.string(),
    });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.int(),
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
  generateIO(io) {
    io.dataInput({
      id: "url",
      name: "URL",
      type: t.string(),
    });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.int(),
    });
  },
});
