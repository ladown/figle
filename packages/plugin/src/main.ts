import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { runPipeline } from "./orchestrator.js";
import {
  clearStoredConfig,
  loadStoredConfig,
  saveStoredConfig,
} from "./storage.js";
import type {
  ConfigClearHandler,
  ConfigGetHandler,
  ConfigSaveHandler,
  ConfigState,
  ConfigStateHandler,
  ExtractRequestHandler,
  ExtractResultHandler,
  ExtractResultPayload,
} from "./events.js";

export default function main(): void {
  on<ConfigGetHandler>("CONFIG_GET", async () => {
    const state = await readConfigState();
    emit<ConfigStateHandler>("CONFIG_STATE", state);
  });

  on<ConfigSaveHandler>("CONFIG_SAVE", async (blob) => {
    await saveStoredConfig(blob);
    emit<ConfigStateHandler>("CONFIG_STATE", {
      configured: true,
      hash: blob.hash,
    });
  });

  on<ConfigClearHandler>("CONFIG_CLEAR", async () => {
    await clearStoredConfig();
    emit<ConfigStateHandler>("CONFIG_STATE", { configured: false });
  });

  on<ExtractRequestHandler>("EXTRACT_REQUEST", async () => {
    const payload = await handleExtract();
    emit<ExtractResultHandler>("EXTRACT_RESULT", payload);
  });

  showUI({ width: 480, height: 600 });
}

async function readConfigState(): Promise<ConfigState> {
  const blob = await loadStoredConfig();
  if (!blob) return { configured: false };
  return { configured: true, hash: blob.hash };
}

async function handleExtract(): Promise<ExtractResultPayload> {
  const [node] = figma.currentPage.selection;
  if (!node) {
    return { ok: false, error: "Select a frame, then run Extract." };
  }
  const blob = await loadStoredConfig();
  try {
    const spec = await runPipeline(node, blob?.config ?? null, {
      figmaFileKey: figma.fileKey ?? figma.root.id,
      extractedAt: new Date().toISOString(),
    });
    return { ok: true, spec, warnings: spec.warnings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
