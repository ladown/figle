import {
  BridgeConfigBlobSchema,
  type BridgeConfigBlob,
} from "@figle/spec-schema";

const STORAGE_KEY = "figle.bridge-config-blob";

export async function loadStoredConfig(): Promise<BridgeConfigBlob | null> {
  const raw = await figma.clientStorage.getAsync(STORAGE_KEY);
  if (raw === undefined || raw === null) return null;
  const parsed = BridgeConfigBlobSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function saveStoredConfig(blob: BridgeConfigBlob): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY, blob);
}

export async function clearStoredConfig(): Promise<void> {
  await figma.clientStorage.deleteAsync(STORAGE_KEY);
}

const PREFS_KEY = "figle.extract-preferences";

export type ExtractPreferences = {
  multi: boolean;
};

const DEFAULT_PREFS: ExtractPreferences = { multi: false };

export async function loadExtractPreferences(): Promise<ExtractPreferences> {
  const raw = await figma.clientStorage.getAsync(PREFS_KEY);
  if (raw === undefined || raw === null || typeof raw !== "object") {
    return DEFAULT_PREFS;
  }
  const multi = (raw as { multi?: unknown }).multi === true;
  return { multi };
}

export async function saveExtractPreferences(
  prefs: ExtractPreferences,
): Promise<void> {
  await figma.clientStorage.setAsync(PREFS_KEY, prefs);
}

export function parseConfigBlob(
  input: string,
): { ok: true; blob: BridgeConfigBlob } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const result = BridgeConfigBlobSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "<root>";
    return { ok: false, error: `${path}: ${first?.message ?? "invalid"}` };
  }
  return { ok: true, blob: result.data };
}
