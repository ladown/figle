import {
  Banner,
  Button,
  IconWarning16,
  Muted,
  Stack,
  Text,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import type { Warning } from "@figle/spec-schema";
import { emit, on } from "@create-figma-plugin/utilities";
import { useEffect, useState } from "preact/hooks";
import type {
  ExtractRequestHandler,
  ExtractResultHandler,
  ExtractResultPayload,
} from "../events.js";
import { copyTextToClipboard } from "./copy.js";

const COPIED_RESET_MS = 5000;

export function ExtractTab() {
  const [state, setState] = useState<ExtractResultPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return on<ExtractResultHandler>("EXTRACT_RESULT", (payload) => {
      setBusy(false);
      setCopied(false);
      setState(payload);
    });
  }, []);

  const onExtract = () => {
    setBusy(true);
    setState(null);
    setCopied(false);
    emit<ExtractRequestHandler>("EXTRACT_REQUEST");
  };

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(id);
  }, [copied]);

  const onCopy = async () => {
    if (!state?.ok) return;
    const ok = await copyTextToClipboard(JSON.stringify(state.spec, null, 2));
    setCopied(ok);
  };

  return (
    <div>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Select a frame, click Extract. Review the Spec and warnings, then Copy
          and run <code>npx figle paste</code> in your project.
        </Muted>
      </Text>
      <VerticalSpace space="small" />
      <Stack space="small">
        <Button onClick={onExtract} disabled={busy} fullWidth>
          {busy ? "Extracting…" : "Extract"}
        </Button>
        {state?.ok && (
          <Button onClick={onCopy} secondary fullWidth>
            {copied ? "Copied ✓" : "Copy Spec"}
          </Button>
        )}
      </Stack>
      <VerticalSpace space="small" />
      {state && !state.ok && (
        <Banner icon={<IconWarning16 />} variant="warning">
          {state.error}
        </Banner>
      )}
      {state?.ok && state.warnings.length > 0 && (
        <WarningsPanel warnings={state.warnings} />
      )}
      {state?.ok && <SpecPanel json={JSON.stringify(state.spec, null, 2)} />}
      <VerticalSpace space="medium" />
    </div>
  );
}

function WarningsPanel({ warnings }: { warnings: Warning[] }) {
  return (
    <div>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          {warnings.length} warning{warnings.length === 1 ? "" : "s"}
        </Muted>
      </Text>
      <VerticalSpace space="extraSmall" />
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
        {warnings.map((w) => (
          <li key={`${w.nodeId}-${w.code}`}>
            <strong>{w.code}</strong> <Muted>{w.nodePath}</Muted>
            <div>{w.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecPanel({ json }: { json: string }) {
  return (
    <div>
      <VerticalSpace space="small" />
      <pre
        style={{
          fontSize: 10,
          lineHeight: "14px",
          userSelect: "text",
          cursor: "text",
          whiteSpace: "pre",
          overflowX: "auto",
          overflowY: "visible",
          background: "var(--figma-color-bg-secondary)",
          padding: 8,
          borderRadius: 4,
          margin: 0,
        }}
      >
        {json}
      </pre>
    </div>
  );
}
