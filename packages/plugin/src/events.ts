import type { BridgeConfigBlob, Spec, Warning } from "@figle/spec-schema";
import type { EventHandler } from "@create-figma-plugin/utilities";

export interface ConfigGetHandler extends EventHandler {
  name: "CONFIG_GET";
  handler: () => void;
}

export interface ConfigStateHandler extends EventHandler {
  name: "CONFIG_STATE";
  handler: (state: ConfigState) => void;
}

export interface ConfigSaveHandler extends EventHandler {
  name: "CONFIG_SAVE";
  handler: (blob: BridgeConfigBlob) => void;
}

export interface ExtractRequestHandler extends EventHandler {
  name: "EXTRACT_REQUEST";
  handler: () => void;
}

export interface ExtractResultHandler extends EventHandler {
  name: "EXTRACT_RESULT";
  handler: (payload: ExtractResultPayload) => void;
}

export type ConfigState =
  | { configured: false }
  | { configured: true; hash: string };

export type ExtractResultPayload =
  | { ok: true; spec: Spec; warnings: Warning[] }
  | { ok: false; error: string };
