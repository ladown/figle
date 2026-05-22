import type { EventHandler } from "@create-figma-plugin/utilities";
import type { RawNode } from "./extract/index.js";

export interface ExtractRequestHandler extends EventHandler {
  name: "EXTRACT_REQUEST";
  handler: () => void;
}

export interface ExtractResultHandler extends EventHandler {
  name: "EXTRACT_RESULT";
  handler: (payload: ExtractResultPayload) => void;
}

export type ExtractResultPayload =
  | { ok: true; raw: RawNode }
  | { ok: false; error: string };
