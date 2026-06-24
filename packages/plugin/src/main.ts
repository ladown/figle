import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { runPipeline, type PipelineInput } from "./orchestrator.js";
import {
  clearStoredConfig,
  loadExtractPreferences,
  loadStoredConfig,
  saveExtractPreferences,
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
  PrefsGetHandler,
  PrefsSetHandler,
  PrefsStateHandler,
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

  on<PrefsGetHandler>("PREFS_GET", async () => {
    const prefs = await loadExtractPreferences();
    emit<PrefsStateHandler>("PREFS_STATE", prefs);
  });

  on<PrefsSetHandler>("PREFS_SET", async (prefs) => {
    await saveExtractPreferences(prefs);
    emit<PrefsStateHandler>("PREFS_STATE", prefs);
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
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return { ok: false, error: "Select at least one frame, then run Extract." };
  }

  const prefs = await loadExtractPreferences();
  const targets =
    prefs.multi && selection.length > 1 ? [...selection] : [selection[0]!];

  const blob = await loadStoredConfig();
  const extractedAt = new Date().toISOString();
  const figmaFileKey = figma.fileKey ?? figma.root.id;

  try {
    const inputs: PipelineInput[] = targets.map((node) => ({
      node,
      meta: {
        figmaFileKey,
        nodeId: node.id,
        nodeName: node.name,
        ...("width" in node && "height" in node
          ? { width: node.width, height: node.height }
          : {}),
        extractedAt,
      },
    }));
    const payload = await runPipeline(inputs, blob?.config ?? null, {
      outputDir: prefs.outputDir,
    });
    const warnings = payload.specs.flatMap((s) => s.warnings);
    return { ok: true, payload, warnings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
