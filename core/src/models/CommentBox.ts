import { createMutable } from "solid-js/store";
import { z } from "zod";
import { XY } from "../bindings";

export const SerializedCommentBox = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    x: z.number(),
    y: z.number(),
  }),
  text: z.string(),
});

export interface CommentBoxArgs {
  position: XY;
  size: XY;
  text: string;
}
export class CommentBox {
  position: XY;
  size: XY;
  text: string;

  selected = false;

  constructor(args: CommentBoxArgs) {
    this.position = args.position;
    this.size = args.size;
    this.text = args.text;

    return createMutable(this);
  }
}
