import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { walkNode } from "./extract/index.js";
import type {
  ExtractRequestHandler,
  ExtractResultHandler,
  ExtractResultPayload,
} from "./events.js";

export default function main(): void {
  on<ExtractRequestHandler>("EXTRACT_REQUEST", async () => {
    const payload = await handleExtract();
    emit<ExtractResultHandler>("EXTRACT_RESULT", payload);
  });
  showUI({ width: 400, height: 520 });
}

async function handleExtract(): Promise<ExtractResultPayload> {
  const [node] = figma.currentPage.selection;
  if (!node) {
    return { ok: false, error: "Select a frame, then run Extract." };
  }
  try {
    const raw = await walkNode(node);
    return { ok: true, raw };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
