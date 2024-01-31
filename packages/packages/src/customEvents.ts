import { Package, PropertyDef } from "@macrograph/runtime";

export function pkg() {
  const pkg = new Package({
    name: "Custom Events",
  });

  const eventProperty = {
    name: "Custom Event",
    source: ({ node }) =>
      [...node.graph.project.customEvents].map(([id, event]) => ({
        id: id,
        display: event.name,
      })),
  } satisfies PropertyDef;

  pkg.createNonEventSchema({
    name: "Emit Custom Event",
    variant: "Base",
    properties: { event: eventProperty },
    createIO({ io, ctx, properties }) {
      const eventId = ctx.getProperty(properties.event);
      if (eventId === undefined) return;
      const event = ctx.graph.project.customEvents.get(eventId);
      if (!event) return;

      return {
        execInput: io.execInput({
          id: "execIn",
          name: event.name,
        }),
        execOutput: io.execOutput({
          id: "",
        }),
        inputs: event.fields.map((field) =>
          io.dataInput({
            id: `${event.id}:${field.id}`,
            name: field.name,
            type: field.type,
          })
        ),
        event,
      };
    },
    run({ ctx, io, properties, graph }) {
      if (!io) return;

      pkg.emitEvent({
        name: `event:${io.event.id.toString()}`,
        data: Object.fromEntries(
          io.inputs.map((input) => [input.id, ctx.getInput(input)])
        ),
      });
      ctx.exec(io.execOutput);
    },
  });

  pkg.createEventSchema({
    event: ({ ctx, properties }) => {
      const eventId = ctx.getProperty(properties.event);
      if (eventId === undefined) return;

      return `event:${eventId}`;
    },
    name: "Custom Event",
    properties: { event: eventProperty },
    createIO({ io, ctx, properties }) {
      const eventId = ctx.getProperty(properties.event);
      if (eventId === undefined) return;
      const event = ctx.graph.project.customEvents.get(eventId);
      if (!event) return;

      return {
        exec: io.execOutput({
          id: "",
          name: event.name,
        }),
        event,
        outputs: event.fields.map((field) =>
          io.dataOutput({
            id: `${event.id}:${field.id}`,
            name: field.name,
            type: field.type,
          })
        ),
      };
    },
    run({ ctx, io, data }) {
      if (!io) return;

      io.outputs.forEach((o) => ctx.setOutput(o, data[o.id]));

      ctx.exec(io.exec);
    },
  });

  return pkg;
}
