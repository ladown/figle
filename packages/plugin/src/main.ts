import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { runPipeline } from "./orchestrator.js";
import { loadStoredConfig, saveStoredConfig } from "./storage.js";
import type {
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
  const blob = await loadStoredConfig();
  if (!blob) {
    return {
      ok: false,
      error: "No bridge config. Paste it in the Settings tab first.",
    };
  }
  const [node] = figma.currentPage.selection;
  if (!node) {
    return { ok: false, error: "Select a frame, then run Extract." };
  }
  try {
    const spec = await runPipeline(node, blob.config, {
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
