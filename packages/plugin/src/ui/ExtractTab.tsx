import { Button, Muted, Text, VerticalSpace } from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { useEffect, useState } from "preact/hooks";
import type {
  ExtractRequestHandler,
  ExtractResultHandler,
  ExtractResultPayload,
} from "../events.js";

export function ExtractTab() {
  const [state, setState] = useState<ExtractResultPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return on<ExtractResultHandler>("EXTRACT_RESULT", (payload) => {
      setBusy(false);
      setState(payload);
    });
  }, []);

  const onExtract = () => {
    setBusy(true);
    setState(null);
    emit<ExtractRequestHandler>("EXTRACT_REQUEST");
  };

  return (
    <div>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Select a frame, then click Extract. Raw node tree (pre-resolve) will
          appear below.
        </Muted>
      </Text>
      <VerticalSpace space="small" />
      <Button onClick={onExtract} disabled={busy} fullWidth>
        {busy ? "Extracting…" : "Extract"}
      </Button>
      <VerticalSpace space="small" />
      {state && !state.ok && (
        <Text>
          <Muted>{state.error}</Muted>
        </Text>
      )}
      {state && state.ok && (
        <pre
          style={{
            fontSize: 10,
            lineHeight: "12px",
            maxHeight: 320,
            overflow: "auto",
            background: "var(--figma-color-bg-secondary)",
            padding: 8,
            borderRadius: 4,
            margin: 0,
          }}
        >
          {JSON.stringify(state.raw, null, 2)}
        </pre>
      )}
      <VerticalSpace space="medium" />
    </div>
  );
}
